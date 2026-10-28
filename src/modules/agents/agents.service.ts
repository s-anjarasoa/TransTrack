import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource, Between } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { Agent, AgentType } from '../../entities/agent.entity';
import { Status, AgentStatus } from '../../entities/status.entity';
import { User } from '../../entities/user.entity';
import { Societe } from '../../entities/societe.entity';
import { RolesService } from '../roles/roles.service';
import { AuthService } from '../auth/auth.service';
import { CreateAgentDto } from './dto/create-agent.dto';
import { UpdateAgentDto } from './dto/update-agent.dto';
import { FilterAgentsDto } from './dto/filter-agent.dto';
import { ChangeAgentStatusDto } from './../status/dto/change-status.dto';
import { NotificationsService } from '../notifications/notifications.service';
import {
  NotificationType,
  NotificationPriorite,
} from '../../entities/notification.entity';

type Requester = { id: number; role: string };

@Injectable()
export class AgentsService {
  private readonly logger = new Logger(AgentsService.name);

  constructor(
    @InjectRepository(Agent) private agentRepository: Repository<Agent>,
    @InjectRepository(User) private userRepository: Repository<User>,
    @InjectRepository(Societe) private societeRepository: Repository<Societe>,
    @InjectRepository(Status) private statusRepository: Repository<Status>,
    @InjectDataSource() private dataSource: DataSource,
    private rolesService: RolesService,
    private notificationsService: NotificationsService,
    private authService: AuthService,
  ) {}

  // ============================================================
  // AUTORISATIONS
  // ============================================================
  /**
   * Vérifie que `requester` peut accéder à `agent`.
   * - ADMIN : toujours autorisé (retourne null)
   * - Sinon : doit être un agent VALIDE de la MÊME société
   * - manage=true : doit en plus être Directeur ou Gérant, ne pas viser
   *   son propre compte, et ne pas viser un Directeur.
   * Retourne l'agent du demandeur (ou null pour un ADMIN).
   */
  private async assertCanAccess(
    agent: Agent,
    requester: Requester,
    opts: { manage: boolean },
  ): Promise<Agent | null> {
    if (requester.role === 'ADMIN') return null;

    const me = await this.agentRepository.findOne({
      where: { userId: requester.id },
    });

    if (
      !me ||
      me.status !== AgentStatus.VALIDE ||
      !me.societeId ||
      me.societeId !== agent.societeId
    ) {
      throw new ForbiddenException(
        "Accès refusé : cet agent n'appartient pas à votre société",
      );
    }

    if (opts.manage) {
      const isManager =
        me.type === AgentType.DIRECTEUR || me.type === AgentType.GERANT;
      if (!isManager) {
        throw new ForbiddenException(
          'Seul un Directeur ou un Gérant peut effectuer cette action',
        );
      }
      if (me.id === agent.id) {
        throw new ForbiddenException(
          'Vous ne pouvez pas modifier votre propre statut',
        );
      }
      if (agent.type === AgentType.DIRECTEUR) {
        throw new ForbiddenException(
          "Seul un administrateur peut modifier le statut d'un Directeur",
        );
      }
    }

    return me;
  }

  // ============================================================
  // CRÉATION PAR ADMIN
  // ============================================================
  async createByAdmin(dto: CreateAgentDto): Promise<Agent> {
    const existingUser = await this.userRepository.findOne({
      where: { email: dto.email },
    });
    if (existingUser) {
      throw new ConflictException('Email déjà utilisé');
    }

    if (dto.type !== AgentType.DIRECTEUR && !dto.societeId) {
      throw new BadRequestException("societeId est requis pour ce type d'agent");
    }
    if (dto.type === AgentType.DIRECTEUR && dto.societeId) {
      throw new BadRequestException(
        'Un DIRECTEUR ne peut pas être rattaché à une société existante lors de sa création',
      );
    }

    const role = await this.rolesService.findByName('AGENT');
    if (!role) throw new NotFoundException('Rôle AGENT non trouvé');

    return this.dataSource.transaction(async (manager) => {
      const hashedPassword = await bcrypt.hash(dto.password, 10);
      const user = manager.create(User, {
        email: dto.email,
        password: hashedPassword,
        firstName: dto.firstName,
        lastName: dto.lastName,
        roleId: role.id,
        isActive: true,
        profileCompleted: true,
      });
      const savedUser = await manager.save(user);

      const agent = manager.create(Agent, {
        userId: savedUser.id,
        CIN: dto.CIN,
        phone: dto.phone,
        address: dto.address,
        type: dto.type,
        societeId: dto.societeId,
        status:
          dto.type === AgentType.DIRECTEUR
            ? AgentStatus.PRE_VALIDE
            : AgentStatus.VALIDE,
      });
      return manager.save(agent);
    });
  }

  // ============================================================
  // LECTURE
  // ============================================================
  async findAll(filter: FilterAgentsDto, requestingUser: Requester) {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 10;
    const where: any = {};

    if (requestingUser.role !== 'ADMIN') {
      const requestingAgent = await this.agentRepository.findOne({
        where: { userId: requestingUser.id },
      });
      if (!requestingAgent?.societeId) {
        return { data: [], total: 0, page, limit };
      }
      where.societeId = requestingAgent.societeId;
    } else if (filter.societeId) {
      where.societeId = filter.societeId;
    }

    if (filter.type) where.type = filter.type;
    if (filter.status) where.status = filter.status;
    if (filter.CIN) where.CIN = filter.CIN;
    if (filter.userId) where.userId = filter.userId;
    if (filter.fromDate && filter.toDate) {
      where.createdAt = Between(
        new Date(filter.fromDate),
        new Date(filter.toDate),
      );
    }

    const [data, total] = await this.agentRepository.findAndCount({
      where,
      relations: { user: true, societe: true },
      skip: (page - 1) * limit,
      take: limit,
      order: { [filter.orderField ?? 'createdAt']: filter.orderBy ?? 'DESC' },
    });

    return { data, total, page, limit };
  }

  async findByUserId(userId: number): Promise<Agent> {
    const agent = await this.agentRepository.findOne({
      where: { userId },
      relations: { user: true, societe: true },
    });
    if (!agent) throw new NotFoundException('Profil agent introuvable');
    return agent;
  }

  async findOne(id: number): Promise<Agent> {
    const agent = await this.agentRepository.findOne({
      where: { id },
      relations: { user: true, societe: true, statusHistory: true },
    });
    if (!agent) throw new NotFoundException(`Agent avec l'ID ${id} non trouvé`);
    return agent;
  }

  /** Lecture d'un agent avec contrôle d'accès (même société ou ADMIN) */
  async findOneFor(id: number, requester: Requester): Promise<Agent> {
    const agent = await this.findOne(id);
    await this.assertCanAccess(agent, requester, { manage: false });
    return agent;
  }

  // ============================================================
  // MISE À JOUR
  // ============================================================
  async update(
    id: number,
    dto: UpdateAgentDto,
    requester: Requester,
  ): Promise<Agent> {
    const agent = await this.findOne(id);
    let values: Record<string, any>;

    if (requester.role === 'ADMIN') {
      values = { ...dto };
    } else {
      const me = await this.assertCanAccess(agent, requester, { manage: false });

      if (me && me.id === agent.id) {
        // Un agent ne peut modifier que ses coordonnées
        const { phone, address } = dto as any;
        values = {};
        if (phone !== undefined) values.phone = phone;
        if (address !== undefined) values.address = address;
      } else {
        // Directeur/Gérant : pas de changement de statut, société ni utilisateur
        await this.assertCanAccess(agent, requester, { manage: true });
        const { status, societeId, userId, ...rest } = dto as any;
        values = rest;
        if (values.type === AgentType.DIRECTEUR) {
          throw new ForbiddenException(
            'Seul un administrateur peut nommer un Directeur',
          );
        }
      }
    }

    if (Object.keys(values).length > 0) {
      await this.agentRepository.update(id, values);
    }
    return this.findOne(id);
  }

  // ============================================================
  // ✅ CHANGEMENT DE STATUT
  // EN_ATTENTE -> PRE_VALIDE : envoie le code d'invitation par e-mail
  // PRE_VALIDE -> VALIDE      : se fait par la saisie du code (AuthService)
  // ============================================================
  async changeStatus(
    id: number,
    dto: ChangeAgentStatusDto,
    requester: Requester,
  ): Promise<Agent> {
    const agent = await this.findOne(id);
    const isAdmin = requester.role === 'ADMIN';

    await this.assertCanAccess(agent, requester, { manage: true });

    // Pour un Directeur/Gérant, « valider » une demande en cours = l'approuver :
    // le statut devient PRE_VALIDE et le code d'invitation est (ré)envoyé.
    // La validation finale (VALIDE) ne se fait que par la saisie du code
    // (seul un ADMIN peut valider directement).
    let targetStatus = dto.status;
    if (
      !isAdmin &&
      dto.status === AgentStatus.VALIDE &&
      agent.status !== AgentStatus.VALIDE
    ) {
      if (
        agent.status === AgentStatus.EN_ATTENTE ||
        agent.status === AgentStatus.PRE_VALIDE
      ) {
        targetStatus = AgentStatus.PRE_VALIDE;
      } else {
        throw new BadRequestException(
          `Impossible de valider une demande au statut ${agent.status}.`,
        );
      }
    }

    await this.agentRepository.update(id, { status: targetStatus });

    await this.statusRepository.save({
      agentId: id,
      status: targetStatus,
      changedByUserId: requester.id,
      reason: dto.reason,
      isActive: targetStatus === AgentStatus.VALIDE,
    });

    // ✅ PRE_VALIDE → générer et envoyer le code par e-mail
    if (targetStatus === AgentStatus.PRE_VALIDE) {
      await this.authService.issueInvitationCode(id);
    }

    // ✅ VALIDE (par un ADMIN uniquement) → l'utilisateur devient AGENT
    if (targetStatus === AgentStatus.VALIDE) {
      const agentRole = await this.rolesService.findByName('AGENT');
      if (!agentRole) throw new NotFoundException('Rôle AGENT non trouvé');

      await this.userRepository.update(agent.userId, {
        roleId: agentRole.id,
        profileCompleted: true,
        isActive: true,
      });

      await this.notificationsService.notifyUsers([agent.userId], {
        type: NotificationType.VALIDATION_AGENT,
        titre: '✅ Compte validé',
        message: `Votre inscription à ${agent.societe?.name} a été validée. Vous pouvez vous connecter.`,
        priorite: NotificationPriorite.NORMALE,
      });
    }

    // ✅ REJETE → l'utilisateur reste PENDING et actif (il voit le refus et
    // peut renvoyer une demande) ; le code éventuel est invalidé.
    if (targetStatus === AgentStatus.REJETE) {
      await this.agentRepository.update(id, {
        codeHash: null,
        codeExpiresAt: null,
        codeAttempts: 0,
      });

      await this.notificationsService.notifyUsers([agent.userId], {
        type: NotificationType.VALIDATION_AGENT,
        titre: '❌ Demande rejetée',
        message: `Votre demande à ${agent.societe?.name} a été rejetée.`,
        priorite: NotificationPriorite.HAUTE,
      });
    }

    this.logger.log(`Agent ${id} → ${targetStatus} (par user ${requester.id})`);

    return this.findOne(id);
  }
  async createTeamAgent(dto: CreateAgentDto, requester: Requester) {
    // 1. Récupérer l'agent connecté pour trouver son societeId
    const me = await this.agentRepository.findOne({
      where: { userId: requester.id },
    });

    if (!me || !me.societeId) {
      throw new ForbiddenException("Impossible de déterminer votre société.");
    }

    // 2. Vérifier si l'email est déjà pris
    const existingUser = await this.userRepository.findOne({
      where: { email: dto.email },
    });
    if (existingUser) {
      throw new ConflictException('Email déjà utilisé');
    }

    const role = await this.rolesService.findByName('AGENT');
    if (!role) throw new NotFoundException('Rôle AGENT non trouvé');

    // 3. Création en transaction
    const savedAgentId = await this.dataSource.transaction(async (manager) => {
      const user = manager.create(User, {
        email: dto.email,
        password: await bcrypt.hash(Math.random().toString(36), 10),
        firstName: dto.firstName,
        lastName: dto.lastName,
        roleId: role.id,
        isActive: true,
        profileCompleted: false,
      });
      const savedUser = await manager.save(user);

      const agent = manager.create(Agent, {
        userId: savedUser.id,
        CIN: dto.CIN,
        phone: dto.phone,
        address: dto.address,
        type: dto.type,
        societeId: me.societeId, // ⚠️ Assurez-vous que me.societeId existe bien
        status: AgentStatus.PRE_VALIDE,
      });
      const savedAgent = await manager.save(agent);
      return savedAgent.id;
    });

    // 4. Appel de l'envoi du code d'invitation hors de la transaction (ou proprement)
    // En passant par un findOne complet pour que les relations (societe, user) soient chargées
    await this.authService.issueInvitationCode(savedAgentId);

    // 5. Renvoyer l'agent complet
    const finalAgent = await this.findOne(savedAgentId);
    return {
      agent: finalAgent,
      emailSent: true,
    };
  }

  async remove(id: number): Promise<void> {
    const result = await this.agentRepository.delete(id);
    if (result.affected === 0)
      throw new NotFoundException(`Agent avec l'ID ${id} non trouvé`);
  }
}