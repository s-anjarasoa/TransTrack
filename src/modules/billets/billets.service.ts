import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';

import { Billet, BilletStatut, BilletCategorie } from '../../entities/billet.entity';
import { Reservation } from '../../entities/reservation.entity';
import { Client } from '../../entities/client.entity';
import { Agent } from '../../entities/agent.entity';
import { CreateBilletDto } from './dto/create-billet.dto';
import { MailService } from 'src/mail/mail.service';

interface RequestingUser {
  id: number;
  role: string;
}

@Injectable()
export class BilletService {
  constructor(
    @InjectRepository(Billet) private billetRepository: Repository<Billet>,
    @InjectRepository(Reservation) private reservationRepository: Repository<Reservation>,
    @InjectRepository(Client) private clientRepository: Repository<Client>,
    @InjectRepository(Agent) private agentRepository: Repository<Agent>,
    private mailService: MailService,
  ) {}

  private generateNumero(): string {
    const year = new Date().getFullYear();
    return `BLT-${year}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  }

  private generateQrCode(numeroBillet: string): string {
    return crypto.createHash('sha256').update(`${numeroBillet}-${Date.now()}`).digest('hex').slice(0, 24);
  }

  private async assertReservationAccess(reservationId: number, requestingUser: RequestingUser): Promise<Reservation> {
    const reservation = await this.reservationRepository.findOne({
      where: { id: reservationId },
      relations: { voyage: true, billets: true },
    });
    if (!reservation) throw new NotFoundException('Réservation introuvable');

    if (requestingUser.role === 'ADMIN') return reservation;

    if (requestingUser.role === 'CLIENT') {
      const client = await this.clientRepository.findOne({ where: { userId: requestingUser.id } });
      if (!client || client.id !== reservation.clientId) {
        throw new ForbiddenException('Cette réservation ne vous appartient pas');
      }
      return reservation;
    }

    if (requestingUser.role === 'AGENT') {
      const agent = await this.agentRepository.findOne({ where: { userId: requestingUser.id } });
      if (!agent || agent.societeId !== reservation.voyage.societeId) {
        throw new ForbiddenException('Cette réservation n\'appartient pas à votre société');
      }
      return reservation;
    }

    throw new ForbiddenException('Accès non autorisé');
  }

  async create(dto: CreateBilletDto, requestingUser: RequestingUser): Promise<Billet> {
    const reservation = await this.assertReservationAccess(dto.reservationId, requestingUser);

    if (reservation.billets.length >= reservation.nombrePlaces) {
      throw new BadRequestException(`Nombre maximum de billets déjà atteint (${reservation.nombrePlaces})`);
    }

    const numeroBillet = this.generateNumero();
    const billet = this.billetRepository.create({
      ...dto,
      numeroBillet,
      qrCode: this.generateQrCode(numeroBillet),
      prix: Number(reservation.prixTotal) / reservation.nombrePlaces,
      clientId: reservation.clientId,
    });

    return this.billetRepository.save(billet);
  }

  async findByReservation(reservationId: number, requestingUser: RequestingUser): Promise<Billet[]> {
    await this.assertReservationAccess(reservationId, requestingUser);
    return this.billetRepository.find({ where: { reservationId }, order: { createdAt: 'ASC' } });
  }

  async findOne(id: number): Promise<Billet> {
    const billet = await this.billetRepository.findOne({
      where: { id },
      relations: { reservation: { voyage: { route: true }, client: { user: true } } },
    });
    if (!billet) throw new NotFoundException(`Billet avec l'ID ${id} non trouvé`);
    return billet;
  }

  async annuler(id: number, requestingUser: RequestingUser): Promise<Billet> {
    const billet = await this.findOne(id);
    await this.assertReservationAccess(billet.reservationId, requestingUser);

    if (billet.statut === BilletStatut.UTILISE) {
      throw new BadRequestException('Un billet déjà utilisé ne peut pas être annulé');
    }

    await this.billetRepository.update(id, { statut: BilletStatut.ANNULE });
    return this.findOne(id);
  }

  async valider(id: number, requestingUser: RequestingUser): Promise<Billet> {
    const billet = await this.findOne(id);
    await this.assertReservationAccess(billet.reservationId, requestingUser);

    if (requestingUser.role === 'CLIENT') {
      throw new ForbiddenException('Seul un Agent peut valider un billet à l\'embarquement');
    }
    if (billet.statut !== BilletStatut.VALIDE) {
      throw new BadRequestException('Ce billet n\'est pas dans un état permettant l\'embarquement');
    }

    await this.billetRepository.update(id, { statut: BilletStatut.UTILISE, dateUtilisation: new Date() });
    return this.findOne(id);
  }

  // ✅ 1. Validation par Scan QR Code
    // ✅ Validation par Scan QR (Accepte le QR Code ou le Numéro de Billet)
  async validerParQrCode(qrCode: string, requestingUser: RequestingUser): Promise<Billet> {
    // On cherche si ça correspond à un vrai qrCode OU au numéro écrit sur le billet
    const billet = await this.billetRepository.findOne({
      where: [
        { qrCode: qrCode },
        { numeroBillet: qrCode } 
      ],
      relations: { reservation: { voyage: { route: true }, client: { user: true } } },
    });

    if (!billet) throw new NotFoundException('Billet introuvable avec ce code');
    
    if (billet.statut === BilletStatut.UTILISE) {
      throw new BadRequestException('Ce billet a déjà été utilisé');
    }
    if (billet.statut === BilletStatut.ANNULE) {
      throw new BadRequestException('Ce billet est annulé');
    }

    await this.billetRepository.update(billet.id, {
      statut: BilletStatut.UTILISE,
      dateUtilisation: new Date(),
    });
    
    return this.findOne(billet.id);
  }
  // ✅ 2. Envoi par Email
  async envoyerParEmail(id: number): Promise<void> {
    const billet = await this.findOne(id);
    const email = billet.reservation?.client?.user?.email;
    
    if (!email) {
      throw new BadRequestException('Aucun email associé à ce client');
    }

    await this.mailService.sendTicketEmail(email, billet);
  }
}