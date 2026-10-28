import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, Like, In, FindOptionsWhere } from 'typeorm';
import { Bagage, BagageType } from '../../entities/bagage.entity';
import { Reservation, ReservationStatut } from '../../entities/reservation.entity';
import { Agent } from '../../entities/agent.entity';
import { CreateBagageDto } from './dto/create-bagage.dto';
import { UpdateBagageDto } from './dto/update-bagage.dto';
import { FilterBagagesDto } from './dto/filter-bagage.dto';

interface RequestingUser {
  id: number;
  role: string;
}

@Injectable()
export class BagagesService {
  constructor(
    @InjectRepository(Bagage)
    private bagageRepository: Repository<Bagage>,

    @InjectRepository(Reservation)
    private reservationRepository: Repository<Reservation>,

    @InjectRepository(Agent)
    private agentRepository: Repository<Agent>,
  ) {}

  private async getRequestingAgentSocieteId(
    requestingUser: RequestingUser,
  ): Promise<number | null> {
    if (requestingUser.role === 'ADMIN') return null;

    const agent = await this.agentRepository.findOne({
      where: { userId: requestingUser.id },
    });

    return agent?.societeId ?? null;
  }

  private generateNumeroEtiquette(): string {
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 1000000)
      .toString()
      .padStart(6, '0');
    return `BAG-${year}-${random}`;
  }

  /** Vérifie l'appartenance du bagage à la société de l'appelant (ADMIN toujours autorisé) */
  private async assertOwnership(
    id: number,
    requestingUser: RequestingUser,
  ): Promise<Bagage> {
    const bagage = await this.getRaw(id);

    if (requestingUser.role === 'ADMIN') return bagage;

    const societeId = await this.getRequestingAgentSocieteId(requestingUser);
    const bagageSocieteId = bagage.reservation?.voyage?.societeId;

    if (!societeId || bagageSocieteId !== societeId) {
      throw new ForbiddenException('Ce bagage n\'appartient pas à votre société');
    }

    return bagage;
  }

    async create(dto: CreateBagageDto, requestingUser: RequestingUser): Promise<Bagage> {
    const reservation = await this.reservationRepository.findOne({
      where: { id: dto.reservationId },
      relations: { voyage: true },
    });

    if (!reservation) {
      throw new NotFoundException('Réservation introuvable');
    }

    // Vérification de sécurité : seul un agent ou admin peut ajouter un bagage
    if (requestingUser.role === 'CLIENT') {
       throw new ForbiddenException('Seul un agent peut ajouter des bagages.');
    }

    const societeId = await this.getRequestingAgentSocieteId(requestingUser);
    if (societeId && reservation.voyage?.societeId !== societeId) {
      throw new ForbiddenException(
        'Cette réservation n\'appartient pas à votre société',
      );
    }

    if (reservation.statut === ReservationStatut.ANNULEE) {
      throw new BadRequestException(
        'Impossible d\'ajouter un bagage à une réservation annulée',
      );
    }

    // ✅ RÈGLE MÉTIER : 6 kg gratuits par personne
    const allowedWeight = reservation.nombrePlaces * 6;
    let supplementPrix = 0;

    if (dto.poids > allowedWeight) {
      const extraWeight = dto.poids - allowedWeight;
      supplementPrix = extraWeight * 5000; // 5000 Ar par kg supplémentaire
    }

    const bagage = this.bagageRepository.create({
      ...dto,
      supplementPrix, // On assigne le prix calculé
      numeroEtiquette: this.generateNumeroEtiquette(),
    });

    return this.bagageRepository.save(bagage);
  }
  async findAll(filter: FilterBagagesDto, requestingUser: RequestingUser) {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 10;
    const where: FindOptionsWhere<Bagage> = {};

    if (filter.type) where.type = filter.type;
    if (filter.numeroEtiquette) where.numeroEtiquette = Like(`%${filter.numeroEtiquette}%`);
    if (filter.poidsMin !== undefined && filter.poidsMax !== undefined) {
      where.poids = Between(filter.poidsMin, filter.poidsMax);
    }

    // ✅ Isolation par société corrigée : utilise In() sur les IDs réellement autorisés
    if (requestingUser.role !== 'ADMIN') {
      const societeId = await this.getRequestingAgentSocieteId(requestingUser);
      if (!societeId) return { data: [], total: 0, page, limit };

      const reservations = await this.reservationRepository.find({
        where: { voyage: { societeId } },
        select: { id: true },
        relations: { voyage: true },
      });

      const allowedIds = reservations.map((r) => r.id);
      if (allowedIds.length === 0) return { data: [], total: 0, page, limit };

      if (filter.reservationId) {
        if (!allowedIds.includes(filter.reservationId)) {
          return { data: [], total: 0, page, limit };
        }
        where.reservationId = filter.reservationId;
      } else {
        where.reservationId = In(allowedIds);
      }
    } else if (filter.reservationId) {
      where.reservationId = filter.reservationId;
    }

    if (filter.search) {
      return this.searchBagages(filter.search, page, limit, requestingUser);
    }

    const [data, total] = await this.bagageRepository.findAndCount({
      where,
      relations: { reservation: true },
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return { data, total, page, limit };
  }

  private async searchBagages(
    search: string,
    page: number,
    limit: number,
    requestingUser: RequestingUser,
  ) {
    let allowedIds: number[] | null = null;

    if (requestingUser.role !== 'ADMIN') {
      const societeId = await this.getRequestingAgentSocieteId(requestingUser);
      if (!societeId) return { data: [], total: 0, page, limit };

      const reservations = await this.reservationRepository.find({
        where: { voyage: { societeId } },
        select: { id: true },
        relations: { voyage: true },
      });
      allowedIds = reservations.map((r) => r.id);
      if (allowedIds.length === 0) return { data: [], total: 0, page, limit };
    }

    const baseConditions = [
      { numeroEtiquette: Like(`%${search}%`) },
      { description: Like(`%${search}%`) },
    ];

    const where = allowedIds
      ? baseConditions.map((c) => ({ ...c, reservationId: In(allowedIds!) }))
      : baseConditions;

    const [data, total] = await this.bagageRepository.findAndCount({
      where,
      relations: { reservation: true },
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return { data, total, page, limit };
  }

  /** Lecture brute sans vérification — usage interne uniquement */
  private async getRaw(id: number): Promise<Bagage> {
    const bagage = await this.bagageRepository.findOne({
      where: { id },
      relations: {
        reservation: {
          voyage: true,
          client: true,
        },
      },
    });

    if (!bagage) {
      throw new NotFoundException(`Bagage avec l'ID ${id} non trouvé`);
    }

    return bagage;
  }

  /** ✅ Point d'entrée public : vérifie toujours l'appartenance avant de renvoyer le bagage */
  async findOne(id: number, requestingUser: RequestingUser): Promise<Bagage> {
    return this.assertOwnership(id, requestingUser);
  }

  /** ✅ Vérifie que la réservation appartient bien à l'appelant avant de lister ses bagages */
  async findByReservation(reservationId: number, requestingUser: RequestingUser): Promise<Bagage[]> {
    const reservation = await this.reservationRepository.findOne({
      where: { id: reservationId },
      relations: { voyage: true },
    });
    if (!reservation) throw new NotFoundException('Réservation introuvable');

    if (requestingUser.role !== 'ADMIN') {
      const societeId = await this.getRequestingAgentSocieteId(requestingUser);
      if (!societeId || reservation.voyage?.societeId !== societeId) {
        throw new ForbiddenException('Cette réservation n\'appartient pas à votre société');
      }
    }

    return this.bagageRepository.find({
      where: { reservationId },
      order: { createdAt: 'ASC' },
    });
  }

  async update(
    id: number,
    dto: UpdateBagageDto,
    requestingUser: RequestingUser,
  ): Promise<Bagage> {
    await this.assertOwnership(id, requestingUser);
    await this.bagageRepository.update(id, dto);
    return this.getRaw(id);
  }

  async remove(id: number, requestingUser: RequestingUser): Promise<void> {
    await this.assertOwnership(id, requestingUser);
    await this.bagageRepository.delete(id);
  }

  async getStatistics() {
    const bagages = await this.bagageRepository.find();

    const byType = {} as Record<BagageType, number>;
    Object.values(BagageType).forEach((t) => (byType[t] = 0));

    let poidsTotal = 0;
    let supplementTotal = 0;

    bagages.forEach((b) => {
      byType[b.type] = (byType[b.type] || 0) + 1;
      poidsTotal += Number(b.poids);
      supplementTotal += Number(b.supplementPrix);
    });

    return {
      total: bagages.length,
      byType,
      poidsTotal,
      poidsMoyen: bagages.length ? poidsTotal / bagages.length : 0,
      supplementTotal,
    };
  }
}