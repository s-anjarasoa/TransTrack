import { Injectable, ConflictException, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource, Between } from 'typeorm';
import * as crypto from 'crypto';
import { Societe, SocieteStatut } from '../../entities/societe.entity';
import { Agent, AgentType } from '../../entities/agent.entity';
import { Status, AgentStatus } from '../../entities/status.entity';
import { User } from '../../entities/user.entity';
import { CreateSocieteDto } from './dto/create-societe.dto';
import { UpdateSocieteDto } from './dto/update-societe.dto';
import { FilterSocietesDto } from './dto/filter-societe.dto';
import { ValidateSocieteDto } from './dto/validate-societe.dto';
import { activeSubscriptionSql, hasActiveSubscription } from '../../common/utils/subscription.util';

import { NotificationsService } from '../notifications/notifications.service';
import {
  NotificationType,
  NotificationPriorite,
} from '../../entities/notification.entity';

@Injectable()
export class SocietesService {
  constructor(
    @InjectRepository(Societe) private societeRepository: Repository<Societe>,
    @InjectRepository(Agent) private agentRepository: Repository<Agent>,
    @InjectRepository(Status) private statusRepository: Repository<Status>,
    @InjectRepository(User) private userRepository: Repository<User>,
    @InjectDataSource() private dataSource: DataSource,
    private notificationsService: NotificationsService,
  ) {}

 
  async create(dto: CreateSocieteDto, requestingUserId: number): Promise<Societe> {
    const directeurAgent = await this.agentRepository.findOne({
      where: { userId: requestingUserId },
    });

    if (!directeurAgent) {
      throw new ForbiddenException(
        'Seul un compte Agent de type DIRECTEUR peut créer une société',
      );
    }
    if (directeurAgent.type !== AgentType.DIRECTEUR) {
      throw new ForbiddenException('Seul un Directeur peut créer une société');
    }
    if (directeurAgent.societeId) {
      throw new ConflictException('Ce Directeur est déjà rattaché à une société');
    }

    const existingNif = await this.societeRepository.findOne({
      where: { nif: dto.nif },
    });
    if (existingNif) {
      throw new ConflictException('Une société avec ce NIF existe déjà');
    }

    const societe = await this.dataSource.transaction(async (manager) => {
      const codeInvitation = crypto.randomBytes(8).toString('hex');

      const societe = manager.create(Societe, {
        ...dto,
        directeurId: directeurAgent.id,
        statut: SocieteStatut.EN_ATTENTE,
        codeInvitation,
      });
      const savedSociete = await manager.save(societe);

      await manager.update(Agent, directeurAgent.id, {
        societeId: savedSociete.id,
      });

      return savedSociete;
    });

    // ✅ Notification APRÈS la transaction
    const admins = await this.notificationsService.getAdminUserIds();
    await this.notificationsService.notifyUsers(admins, {
      type: NotificationType.VALIDATION_SOCIETE,
      titre: 'Nouvelle société inscrite',
      message: `${societe.name} (NIF ${societe.nif}) a été créée et attend son abonnement.`,
      priorite: NotificationPriorite.HAUTE,
      societeId: societe.id,
      metadata: {
        entityType: 'societe',
        entityId: societe.id,
        actionUrl: `/societes/${societe.id}`,
        actionLabel: 'Consulter',
      },
    });

    return societe;
  }


  async validate(
    id: number,
    dto: ValidateSocieteDto,
    adminUserId: number,
  ): Promise<Societe> {
    if (
      dto.statut !== SocieteStatut.VALIDEE &&
      dto.statut !== SocieteStatut.REJETEE
    ) {
      throw new BadRequestException('Le statut doit être VALIDEE ou REJETEE');
    }

    const societe = await this.findOne(id);

    // Une société est validée par le paiement de son abonnement. L'admin peut
    // la rejeter, ou la réintégrer seulement si un abonnement actif la couvre.
    if (
      dto.statut === SocieteStatut.VALIDEE &&
      !(await hasActiveSubscription(this.dataSource, id))
    ) {
      throw new BadRequestException(
        'Une société est validée automatiquement après le paiement de son abonnement.',
      );
    }

    return this.dataSource.transaction(
      async (manager) => {
        await manager.update(Societe, id, { statut: dto.statut });

        const directeur = await manager.findOne(Agent, {
          where: { id: societe.directeurId },
        });
        if (!directeur) {
          throw new NotFoundException('Directeur associé introuvable');
        }

        if (dto.statut === SocieteStatut.VALIDEE) {
          await manager.update(Agent, directeur.id, { status: AgentStatus.VALIDE });
          await manager.update(User, directeur.userId, { isActive: true });
        } else {
          await manager.update(Agent, directeur.id, { status: AgentStatus.REJETE });
        }

        await manager.save(Status, {
          agentId: directeur.id,
          status:
            dto.statut === SocieteStatut.VALIDEE
              ? AgentStatus.VALIDE
              : AgentStatus.REJETE,
          changedByUserId: adminUserId,
          reason:
            dto.reason ??
            `Société ${
              dto.statut === SocieteStatut.VALIDEE ? 'validée' : 'rejetée'
            }`,
          isActive: dto.statut === SocieteStatut.VALIDEE,
        });

        return this.findOne(id);
      },
    );
  }


  async regenerateInvitationCode(
    societeId: number,
    requestingUserId: number,
  ): Promise<{ codeInvitation: string }> {
    const directeurAgent = await this.agentRepository.findOne({
      where: { userId: requestingUserId },
    });
    if (
      !directeurAgent ||
      directeurAgent.societeId !== societeId ||
      directeurAgent.type !== AgentType.DIRECTEUR
    ) {
      throw new ForbiddenException(
        'Seul le Directeur de cette société peut régénérer son code',
      );
    }

    const codeInvitation = crypto.randomBytes(8).toString('hex');
    await this.societeRepository.update(societeId, { codeInvitation });
    return { codeInvitation };
  }


  async findAll(filter: FilterSocietesDto) {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 10;
    const where: any = {};
    if (filter.name) where.name = filter.name;
    if (filter.nif) where.nif = filter.nif;
    if (filter.numState) where.numState = filter.numState;
    if (filter.statut) where.statut = filter.statut;
    if (filter.fromDate && filter.toDate) {
      where.createdAt = Between(
        new Date(filter.fromDate),
        new Date(filter.toDate),
      );
    }

    const [data, total] = await this.societeRepository.findAndCount({
      where,
      relations: { directeur: { user: true } },
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return { data, total, page, limit };
  }

  /**
   * ✅ Liste PUBLIQUE (agents qui postulent, clients) :
   * société VALIDÉE par l'admin ET abonnement payé couvrant aujourd'hui.
   * Seuls les champs publics sont renvoyés (ni code d'invitation, ni Directeur).
   */
  async findAllPublic(filter: FilterSocietesDto) {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 10;

    const qb = this.societeRepository
      .createQueryBuilder('s')
      .select(['s.id', 's.name', 's.address', 's.phone', 's.email', 's.createdAt'])
      .where('s.statut = :statut', { statut: SocieteStatut.VALIDEE })
      .andWhere(activeSubscriptionSql('s'));

    if (filter.name) qb.andWhere('s.name = :name', { name: filter.name });

    const [data, total] = await qb
      .orderBy('s.name', 'ASC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, total, page, limit };
  }

  async findOne(id: number): Promise<Societe> {
    const societe = await this.societeRepository.findOne({
      where: { id },
      relations: { directeur: { user: true }, agents: true, abonnements: true },
    });
    if (!societe)
      throw new NotFoundException(`Société avec l'ID ${id} non trouvée`);
    return societe;
  }
  

  async update(id: number, dto: UpdateSocieteDto): Promise<Societe> {
    await this.societeRepository.update(id, dto);
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    const result = await this.societeRepository.delete(id);
    if (result.affected === 0)
      throw new NotFoundException(`Société avec l'ID ${id} non trouvée`);
  }
}