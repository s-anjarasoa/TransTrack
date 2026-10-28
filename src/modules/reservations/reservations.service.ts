import { Injectable, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource, Between } from 'typeorm';
import * as crypto from 'crypto';

import { PaymentService } from '../payements/payements.service'; 
import { PaymentPurpose } from '../payements/payment-provider.interface'; 

import { Reservation, ReservationStatut, ReservationSource } from '../../entities/reservation.entity';
import { Voyage, VoyageStatut } from '../../entities/voyage.entity';
import { Client } from '../../entities/client.entity';
import { Billet, BilletCategorie, BilletStatut } from '../../entities/billet.entity';
import { Agent, AgentType } from '../../entities/agent.entity';
import { TarifCategorie } from '../../entities/tarif.entity'; 
import { CreateReservationDto } from './dto/create-reservation.dto';
import { CancelReservationDto } from './dto/change-reservation-status.dto';
import { FilterReservationDto } from './dto/filter-reservation.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../../entities/notification.entity';
import { PreferenceLearningService } from '../recommendation/preference-learning.service';

interface RequestingUser {
  id: number;
  role: string;
}

@Injectable()
export class ReservationService {
  constructor(
    @InjectRepository(Reservation) private reservationRepository: Repository<Reservation>,
    @InjectRepository(Voyage) private voyageRepository: Repository<Voyage>,
    @InjectRepository(Client) private clientRepository: Repository<Client>,
    @InjectRepository(Agent) private agentRepository: Repository<Agent>,
    @InjectDataSource() private dataSource: DataSource,
    private notificationsService: NotificationsService,
    private paymentService: PaymentService,
    private preferenceLearningService: PreferenceLearningService, // ✅ INJECTION IA
  ) {}

  private generateCode(): string {
    const year = new Date().getFullYear();
    const random = crypto.randomBytes(4).toString('hex').toUpperCase();
    return `RES-${year}-${random}`;
  }

  // ============================================================
  // CREATE (Gestion des catégories + IA)
  // ============================================================
  async create(dto: CreateReservationDto, requestingUser: RequestingUser): Promise<Reservation> {
    let clientId: number;
    let source = dto.source ?? ReservationSource.EN_LIGNE;

    // 1. Identification du client
    if (requestingUser.role === 'CLIENT') {
      const client = await this.clientRepository.findOne({ where: { userId: requestingUser.id } });
      if (!client) throw new BadRequestException("Vous devez d'abord compléter votre profil client");
      clientId = client.id;
    } else if (requestingUser.role === 'AGENT' || requestingUser.role === 'ADMIN') {
      if (!dto.clientId) throw new BadRequestException('clientId est requis pour une réservation créée au guichet');
      clientId = dto.clientId;
      source = dto.source ?? ReservationSource.GUICHET;
    } else {
      throw new ForbiddenException('Rôle non autorisé à créer une réservation');
    }

    // 2. Création dans une transaction
    const reservation = await this.dataSource.transaction(async (manager) => {
      const voyage = await manager.findOne(Voyage, {
        where: { id: dto.voyageId },
        lock: { mode: 'pessimistic_write' }, // Évite les doubles réservations
      });

      if (!voyage) throw new NotFoundException('Voyage introuvable');
      if (voyage.statut !== VoyageStatut.PLANIFIE && voyage.statut !== VoyageStatut.EN_COURS) {
        throw new BadRequestException("Ce voyage n'accepte plus de réservations");
      }

      let prixTotal = 0;
      let placesDispoPourCategorie = 0;

      // ✅ 3. Gestion des catégories (Mixte vs Simple)
      if (voyage.prixClasse && voyage.prixEconomie) {
        // CAS AVION / TRAIN / BATEAU
        if (!dto.categorie) {
          throw new BadRequestException('Veuillez préciser la catégorie (CLASSE ou ECONOMIE)');
        }

        if (dto.categorie === TarifCategorie.CLASSE) {
          placesDispoPourCategorie = voyage.placesClasseDisponibles!;
          if (placesDispoPourCategorie < dto.nombrePlaces) {
            throw new BadRequestException(`Places insuffisantes en Classe : ${placesDispoPourCategorie} disponible(s)`);
          }
          prixTotal = Number(voyage.prixClasse) * dto.nombrePlaces;
          voyage.placesClasseDisponibles! -= dto.nombrePlaces;
        } else {
          placesDispoPourCategorie = voyage.placesEconomieDisponibles!;
          if (placesDispoPourCategorie < dto.nombrePlaces) {
            throw new BadRequestException(`Places insuffisantes en Économie : ${placesDispoPourCategorie} disponible(s)`);
          }
          prixTotal = Number(voyage.prixEconomie) * dto.nombrePlaces;
          voyage.placesEconomieDisponibles! -= dto.nombrePlaces;
        }
      } else {
        // CAS BUS / TAXI
        placesDispoPourCategorie = voyage.placesDisponibles;
        if (placesDispoPourCategorie < dto.nombrePlaces) {
          throw new BadRequestException(`Places insuffisantes : ${placesDispoPourCategorie} disponible(s)`);
        }
        prixTotal = Number(voyage.prix) * dto.nombrePlaces;
      }

      // ✅ 4. Mise à jour du stock global
      voyage.placesDisponibles -= dto.nombrePlaces;
      const nouvellesPlacesGlobales = voyage.placesDisponibles;
      
      await manager.update(Voyage, voyage.id, {
        placesDisponibles: nouvellesPlacesGlobales,
        placesClasseDisponibles: voyage.placesClasseDisponibles,
        placesEconomieDisponibles: voyage.placesEconomieDisponibles,
        statut: nouvellesPlacesGlobales === 0 ? VoyageStatut.COMPLET : voyage.statut,
      });

      // 5. Création de la réservation
      const newReservation = manager.create(Reservation, {
        codeReservation: this.generateCode(),
        nombrePlaces: dto.nombrePlaces,
        prixTotal,
        statut: ReservationStatut.EN_ATTENTE,
        source,
        dateReservation: new Date(),
        notes: dto.notes,
        categorie: dto.categorie as TarifCategorie,
        sieges: dto.sieges,
        clientId,
        voyageId: dto.voyageId,
      });
      const saved = await manager.save(newReservation);

      // 6. Génération des billets
      const billets: Billet[] = [];
      for (let i = 0; i < dto.nombrePlaces; i++) {
        billets.push(manager.create(Billet, {
          numeroBillet: `BLT-${new Date().getFullYear()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
          reservationId: saved.id,
          prix: prixTotal / dto.nombrePlaces,
          qrCode: crypto.randomUUID(),
          categorie: dto.categorie === TarifCategorie.CLASSE ? BilletCategorie.VIP : BilletCategorie.ADULTE,
          statut: BilletStatut.VALIDE,
          numeroPlace: dto.sieges && dto.sieges[i] ? dto.sieges[i] : undefined, 
        }));
      }
      await manager.save(billets);

      return saved;
    });

    // 7. Notification aux agents
    const voyage = await this.voyageRepository.findOne({
      where: { id: dto.voyageId },
      relations: { route: true },
    });

    if (voyage) {
      const equipe = await this.notificationsService.getSocieteUserIds(
        voyage.societeId,
        [AgentType.DIRECTEUR, AgentType.GERANT, AgentType.RECEPTIONNISTE],
      );

      await this.notificationsService.notifyUsers(equipe, {
        type: NotificationType.RESERVATION,
        titre: 'Nouvelle réservation',
        message: `${reservation.nombrePlaces} place(s) ${dto.categorie ? `(${dto.categorie})` : ''} sur ${voyage.route.depart} → ${voyage.route.arrivee}`,
        societeId: voyage.societeId,
        metadata: {
          entityType: 'reservation',
          entityId: reservation.id,
          actionUrl: `/reservations/${reservation.id}`,
          actionLabel: 'Voir',
        },
      });
    }

    // ✅ 8. NOUVEAU : APPRENTISSAGE DE L'IA
    // Si le client a réservé en cliquant sur une des recommandations, on met à jour ses poids
    if (dto.recommendationContext) {
      const clientForIA = await this.clientRepository.findOne({ where: { id: clientId } });
      if (clientForIA) {
        // Fire-and-forget : On ne bloque pas la réponse API pour l'apprentissage
        this.preferenceLearningService.learnFromChoice(
          clientForIA,
          dto.recommendationContext.proposals,
          dto.recommendationContext.chosenIndex
        ).catch(err => console.error("Erreur d'apprentissage IA", err));
      }
    }

    return reservation;
  }

  // ============================================================
  // LECTURE
  // ============================================================
  async findAll(filter: FilterReservationDto, requestingUser: RequestingUser) {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 10;
    const where: any = {};

    if (requestingUser.role === 'CLIENT') {
      const client = await this.clientRepository.findOne({
        where: { userId: requestingUser.id },
      });
      if (!client) return { data: [], total: 0, page, limit };
      where.clientId = client.id;
    } else if (requestingUser.role === 'AGENT') {
      const agent = await this.agentRepository.findOne({
        where: { userId: requestingUser.id },
      });
      if (!agent?.societeId) return { data: [], total: 0, page, limit };
      where.voyage = { societeId: agent.societeId };
    } else if (filter.clientId) {
      where.clientId = filter.clientId;
    }

    if (filter.statut) where.statut = filter.statut;
    if (filter.voyageId) where.voyageId = filter.voyageId;
    if (filter.fromDate && filter.toDate) {
      where.dateReservation = Between(
        new Date(filter.fromDate),
        new Date(filter.toDate),
      );
    }

    const [data, total] = await this.reservationRepository.findAndCount({
      where,
      relations: {
        client: { user: true },
        voyage: { route: true },
        billets: true,
        paiements: true,
      },
      skip: (page - 1) * limit,
      take: limit,
      order: { dateReservation: 'DESC' },
    });

    return { data, total, page, limit };
  }

  async findOne(id: number): Promise<Reservation> {
    const reservation = await this.reservationRepository.findOne({
      where: { id },
      relations: {
        client: { user: true },
        voyage: { route: true, societe: true },
        billets: true,
        paiements: true,
      },
    });
    if (!reservation)
      throw new NotFoundException(`Réservation avec l'ID ${id} non trouvée`);
    return reservation;
  }

  private async assertAccess(id: number, requestingUser: RequestingUser): Promise<Reservation> {
    const reservation = await this.findOne(id);

    if (requestingUser.role === 'ADMIN') return reservation;

    if (requestingUser.role === 'CLIENT') {
      const client = await this.clientRepository.findOne({
        where: { userId: requestingUser.id },
      });
      if (!client || client.id !== reservation.clientId) {
        throw new ForbiddenException('Cette réservation ne vous appartient pas');
      }
      return reservation;
    }

    if (requestingUser.role === 'AGENT') {
      const agent = await this.agentRepository.findOne({
        where: { userId: requestingUser.id },
      });
      if (!agent || agent.societeId !== reservation.voyage.societeId) {
        throw new ForbiddenException(
          "Cette réservation n'appartient pas à votre société",
        );
      }
      return reservation;
    }

    throw new ForbiddenException('Accès non autorisé');
  }

  // ============================================================
  // ACTIONS (Confirmer, Payer, Annuler)
  // ============================================================
  async confirm(id: number, requestingUser: RequestingUser): Promise<Reservation> {
    const reservation = await this.assertAccess(id, requestingUser);

    if (requestingUser.role === 'CLIENT') {
      throw new ForbiddenException('Seul un Agent peut confirmer une réservation');
    }
    if (reservation.statut !== ReservationStatut.EN_ATTENTE) {
      throw new BadRequestException(
        'Seule une réservation en attente peut être confirmée',
      );
    }

    const updatedReservation = await this.dataSource.transaction(async (manager) => {
      await manager.update(Reservation, id, {
        statut: ReservationStatut.CONFIRMEE,
        dateConfirmation: new Date(),
      });

      const billetsExistants = await manager.find(Billet, { where: { reservationId: id } });
      
      if (billetsExistants.length === 0) {
        const billets: Billet[] = [];
        for (let i = 0; i < reservation.nombrePlaces; i++) {
          billets.push(manager.create(Billet, {
            numeroBillet: `BLT-${new Date().getFullYear()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
            reservationId: id,
            prix: Number(reservation.prixTotal) / reservation.nombrePlaces,
            qrCode: crypto.randomUUID(),
            categorie: reservation.categorie === TarifCategorie.CLASSE ? BilletCategorie.VIP : BilletCategorie.ADULTE,
            statut: BilletStatut.VALIDE,
          }));
        }
        await manager.save(billets);
      }

      return manager.findOneOrFail(Reservation, { 
        where: { id },
        relations: { client: { user: true }, voyage: { route: true }, billets: true }
      });
    });

    if (updatedReservation.client?.userId) {
      await this.notificationsService.notifyUsers(
        [updatedReservation.client.userId],
        {
          type: NotificationType.RESERVATION,
          titre: 'Réservation confirmée',
          message: `Votre réservation ${updatedReservation.codeReservation} est confirmée. Vous pouvez maintenant la régler.`,
          metadata: {
            entityType: 'reservation',
            entityId: id,
            actionUrl: `/reservations/${id}`,
            actionLabel: 'Payer',
          },
        },
      );
    }

    return updatedReservation;
  }

  async payer(reservationId: number, requestingUser: RequestingUser) {
    const reservation = await this.assertAccess(reservationId, requestingUser);

    if (reservation.statut !== ReservationStatut.CONFIRMEE) {
      throw new BadRequestException('La réservation doit être confirmée avant d\'être payée');
    }

    return this.paymentService.createCheckout({
      purposeType: PaymentPurpose.RESERVATION,
      purposeId: reservation.id,
      userId: requestingUser.id,
      amount: Number(reservation.prixTotal),
      description: `Paiement réservation ${reservation.codeReservation}`,
      returnPath: `/client/reservations/${reservation.id}`,
    });
  }

  async markAsPaid(reservationId: number): Promise<void> {
    const reservation = await this.findOne(reservationId);
    if (reservation.statut === ReservationStatut.PAYEE) return;

    await this.reservationRepository.update(reservationId, {
      statut: ReservationStatut.PAYEE,
    });

    if (reservation.client?.userId) {
      await this.notificationsService.notifyUsers(
        [reservation.client.userId],
        {
          type: NotificationType.RESERVATION,
          titre: 'Paiement validé',
          message: `Votre paiement pour la réservation ${reservation.codeReservation} a été accepté. Bon voyage !`,
          metadata: {
            entityType: 'reservation',
            entityId: reservation.id,
            actionUrl: `/client/reservations/${reservation.id}`,
            actionLabel: 'Voir mes billets',
          },
        },
      );
    }
  }

  async cancel(id: number, dto: CancelReservationDto, requestingUser: RequestingUser): Promise<Reservation> {
    const reservation = await this.assertAccess(id, requestingUser);

    if ([ReservationStatut.ANNULEE, ReservationStatut.REMBOURSEE, ReservationStatut.TERMINEE].includes(reservation.statut)) {
      throw new BadRequestException('Cette réservation ne peut plus être annulée');
    }

    return this.dataSource.transaction(async (manager) => {
      await manager.update(Reservation, id, {
        statut: ReservationStatut.ANNULEE,
        dateAnnulation: new Date(),
        motifAnnulation: dto.motifAnnulation,
      });

      await manager.update(Billet, { reservationId: id }, { statut: BilletStatut.ANNULE });

      const voyage = await manager.findOne(Voyage, { where: { id: reservation.voyageId } });
      if (voyage) {
        let updateData: Partial<Voyage> = {
          placesDisponibles: voyage.placesDisponibles + reservation.nombrePlaces,
          statut: voyage.statut === VoyageStatut.COMPLET ? VoyageStatut.PLANIFIE : voyage.statut,
        };

        if (voyage.prixClasse && voyage.prixEconomie) {
          if (reservation.categorie === TarifCategorie.CLASSE) {
            updateData.placesClasseDisponibles = voyage.placesClasseDisponibles! + reservation.nombrePlaces;
          } else {
            updateData.placesEconomieDisponibles = voyage.placesEconomieDisponibles! + reservation.nombrePlaces;
          }
        }

        await manager.update(Voyage, voyage.id, updateData);
      }

      return manager.findOneOrFail(Reservation, { where: { id } });
    });
  }
}