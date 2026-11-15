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

  async findOneFor(id: number, requester: Requester): Promise<Agent> {
    const agent = await this.findOne(id);
    await this.assertCanAccess(agent, requester, { manage: false });
    return agent;
  }

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
        const { phone, address } = dto as any;
        values = {};
        if (phone !== undefined) values.phone = phone;
        if (address !== undefined) values.address = address;
      } else {
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

  async changeStatus(
    id: number,
    dto: ChangeAgentStatusDto,
    requester: Requester,
  ): Promise<Agent> {
    const agent = await this.findOne(id);
    const isAdmin = requester.role === 'ADMIN';

    await this.assertCanAccess(agent, requester, { manage: true });

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

    if (targetStatus === AgentStatus.PRE_VALIDE) {
      await this.authService.issueInvitationCode(id);
    }

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
    const me = await this.agentRepository.findOne({
      where: { userId: requester.id },
    });

    if (!me || !me.societeId) {
      throw new ForbiddenException("Impossible de déterminer votre société.");
    }

    const existingUser = await this.userRepository.findOne({
      where: { email: dto.email },
    });
    if (existingUser) {
      throw new ConflictException('Email déjà utilisé');
    }

    const role = await this.rolesService.findByName('AGENT');
    if (!role) throw new NotFoundException('Rôle AGENT non trouvé');

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
        societeId: me.societeId,
        status: AgentStatus.PRE_VALIDE,
      });
      const savedAgent = await manager.save(agent);
      return savedAgent.id;
    });

    await this.authService.issueInvitationCode(savedAgentId);

    const finalAgent = await this.findOne(savedAgentId);
    return {
      agent: finalAgent,
      emailSent: true,
    };
  }

  async remove(id: number): Promise<void> {
    const agent = await this.agentRepository.findOne({
      where: { id },
      relations: { user: true },
    });

    if (!agent) {
      throw new NotFoundException(`Agent avec l'ID ${id} non trouvé`);
    }

    if (agent.type === AgentType.DIRECTEUR) {
      throw new ForbiddenException(
        'Un Directeur ne peut pas être supprimé. Contactez un administrateur.',
      );
    }

    await this.agentRepository.softDelete(id);

    if (agent.userId) {
      await this.userRepository.update(agent.userId, { isActive: false });
    }

    this.logger.log(
      `Agent ${id} (${agent.user?.email ?? 'email inconnu'}) supprimé (soft delete) et compte désactivé.`,
    );
  }

  async restore(id: number): Promise<Agent> {
    const agent = await this.agentRepository.findOne({
      where: { id },
      withDeleted: true,
    });

    if (!agent) throw new NotFoundException('Agent introuvable');
    if (!agent.deletedAt) throw new BadRequestException("Cet agent n'est pas supprimé");

    await this.agentRepository.restore(id);

    if (agent.userId) {
      await this.userRepository.update(agent.userId, { isActive: true });
    }

    this.logger.log(`Agent ${id} restauré.`);
    return this.findOne(id);
  }
}