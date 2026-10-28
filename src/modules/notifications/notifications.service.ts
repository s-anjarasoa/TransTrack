import { Injectable, NotFoundException, ForbiddenException, Logger, forwardRef, Inject,} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, Like, In, LessThan, FindOptionsWhere } from 'typeorm';
import { Notification, NotificationType, NotificationCanal, NotificationPriorite, NotificationStatut,} from '../../entities/notification.entity';
import { User } from '../../entities/user.entity';
import { Agent } from '../../entities/agent.entity';
import { AgentType } from '../../entities/agent.entity';
import { AgentStatus } from '../../entities/status.entity';
import { CreateNotificationDto } from './dto/create-notification';
import { UpdateNotificationDto } from './dto/update-notification';
import { FilterNotificationsDto } from './dto/filter-notification';
import { AuthService } from '../auth/auth.service';

interface RequestingUser {
  id: number;
  role: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,

    @InjectRepository(User)
    private userRepository: Repository<User>,

    @InjectRepository(Agent)
    private agentRepository: Repository<Agent>,

    @Inject(forwardRef(() => AuthService))  
    private authService: AuthService
  ) {}

  // ============================================================
  // MÉTHODES PRIVÉES
  // ============================================================

  private async getRequestingAgentSocieteId(
    requestingUser: RequestingUser,
  ): Promise<number | null> {
    if (requestingUser.role === 'ADMIN') return null;

    const agent = await this.agentRepository.findOne({
      where: { userId: requestingUser.id },
    });

    return agent?.societeId ?? null;
  }

  private async sendNotification(notification: Notification): Promise<void> {
    try {
      switch (notification.canal) {
        case NotificationCanal.IN_APP:
          break;

        case NotificationCanal.EMAIL:
          this.logger.log(
            `[EMAIL] → user ${notification.userId}: ${notification.titre}`,
          );
          break;

        case NotificationCanal.SMS:
          this.logger.log(
            `[SMS] → user ${notification.userId}: ${notification.titre}`,
          );
          break;

        case NotificationCanal.PUSH:
          this.logger.log(
            `[PUSH] → user ${notification.userId}: ${notification.titre}`,
          );
          break;

        case NotificationCanal.WHATSAPP:
          this.logger.log(
            `[WHATSAPP] → user ${notification.userId}: ${notification.titre}`,
          );
          break;
      }

      notification.statut = NotificationStatut.ENVOYEE;
      notification.dateEnvoi = new Date();
      await this.notificationRepository.save(notification);
    } catch (error) {
      notification.statut = NotificationStatut.ECHOUEE;
      notification.erreurMessage = (error as Error).message;
      await this.notificationRepository.save(notification);
      this.logger.error(
        `Erreur envoi notification ${notification.id}: ${(error as Error).message}`,
      );
    }
  }

  async notifyUsers(
    userIds: number[],
    data: {
      type: NotificationType;
      titre: string;
      message: string;
      priorite?: NotificationPriorite;
      societeId?: number;
      metadata?: Notification['metadata'];
    },
  ): Promise<void> {
    const ids = [...new Set(userIds)].filter((id) => !!id);
    if (ids.length === 0) return;

    try {
      await this.notificationRepository.save(
        ids.map((userId) =>
          this.notificationRepository.create({
            type: data.type,
            titre: data.titre,
            message: data.message,
            priorite: data.priorite ?? NotificationPriorite.NORMALE,
            canal: NotificationCanal.IN_APP,
            statut: NotificationStatut.ENVOYEE,
            dateEnvoi: new Date(),
            userId,
            societeId: data.societeId,
            metadata: data.metadata,
          }),
        ),
      );
    } catch (error) {
      this.logger.error(
        `Notification non enregistrée : ${(error as Error).message}`,
      );
    }
  }

  /** userId des agents validés d'une société, éventuellement limités à certains postes */
  async getSocieteUserIds(
    societeId: number,
    types?: AgentType[],
  ): Promise<number[]> {
    const where: FindOptionsWhere<Agent> = {
      societeId,
      status: AgentStatus.VALIDE,
    };
    if (types?.length) where.type = In(types);

    const agents = await this.agentRepository.find({
      where,
      select: { userId: true },
    });
    return agents.map((a) => a.userId);
  }

  /** userId de tous les admins */
  async getAdminUserIds(): Promise<number[]> {
    const admins = await this.userRepository.find({
      where: { role: { name: 'ADMIN' } },
      select: { id: true },
    });
    return admins.map((u) => u.id);
  }

  async create(dto: CreateNotificationDto): Promise<Notification> {
    if (dto.userId) {
      const user = await this.userRepository.findOne({
        where: { id: dto.userId },
      });
      if (!user) {
        throw new NotFoundException('Utilisateur introuvable');
      }
    }

    const notification = this.notificationRepository.create({
      ...dto,
      statut: NotificationStatut.EN_ATTENTE,
    });

    const saved = await this.notificationRepository.save(notification);
    await this.sendNotification(saved);

    return this.findOne(saved.id);
  }

  async createBulk(dtos: CreateNotificationDto[]): Promise<Notification[]> {
    const results: Notification[] = [];

    for (const dto of dtos) {
      try {
        const notification = await this.create(dto);
        results.push(notification);
      } catch (error) {
        this.logger.error(
          `Erreur création notification: ${(error as Error).message}`,
        );
      }
    }

    return results;
  }

  async findAll(
    filter: FilterNotificationsDto,
    requestingUser: RequestingUser,
  ) {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 10;
    const where: any = {};

    if (filter.type) where.type = filter.type;
    if (filter.canal) where.canal = filter.canal;
    if (filter.priorite) where.priorite = filter.priorite;
    if (filter.statut) where.statut = filter.statut;
    if (filter.userId) where.userId = filter.userId;
    if (filter.societeId) where.societeId = filter.societeId;
    if (filter.isLue !== undefined) where.isLue = filter.isLue;
    if (filter.isArchivee !== undefined) where.isArchivee = filter.isArchivee;

    if (filter.fromDate && filter.toDate) {
      where.createdAt = Between(
        new Date(filter.fromDate),
        new Date(filter.toDate),
      );
    }

    if (requestingUser.role !== 'ADMIN') {
      const societeId = await this.getRequestingAgentSocieteId(requestingUser);
      if (!societeId) {
        where.userId = requestingUser.id;
      } else {
        where.societeId = societeId;
      }
    }

    if (filter.search) {
      return this.searchNotifications(filter.search, page, limit);
    }

    const [data, total] = await this.notificationRepository.findAndCount({
      where,
      relations: { user: true, societe: true },
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return { data, total, page, limit };
  }

  private async searchNotifications(
    search: string,
    page: number,
    limit: number,
  ) {
    const [data, total] = await this.notificationRepository.findAndCount({
      where: [
        { titre: Like(`%${search}%`) },
        { message: Like(`%${search}%`) },
      ],
      relations: { user: true, societe: true },
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return { data, total, page, limit };
  }

  async findOne(
    id: number,
    requestingUser?: RequestingUser,
  ): Promise<Notification> {
    const notification = await this.notificationRepository.findOne({
      where: { id },
      relations: { user: true, societe: true },
    });

    if (!notification) {
      throw new NotFoundException(`Notification avec l'ID ${id} non trouvée`);
    }

    if (
      requestingUser &&
      requestingUser.role !== 'ADMIN' &&
      notification.userId !== requestingUser.id
    ) {
      throw new ForbiddenException('Cette notification ne vous appartient pas');
    }

    return notification;
  }

  async findMyNotifications(
    userId: number,
    filter?: Partial<FilterNotificationsDto>,
  ) {
    const page = filter?.page ?? 1;
    const limit = filter?.limit ?? 20;

    const where: any = { userId };
    if (filter?.isLue !== undefined) where.isLue = filter.isLue;
    if (filter?.type) where.type = filter.type;

    const [data, total] = await this.notificationRepository.findAndCount({
      where,
      relations: { societe: true },
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return { data, total, page, limit };
  }

  async countUnread(userId: number): Promise<number> {
    return this.notificationRepository.count({
      where: { userId, isLue: false },
    });
  }

  async update(
    id: number,
    dto: UpdateNotificationDto,
  ): Promise<Notification> {
    await this.findOne(id);
    await this.notificationRepository.update(id, dto as any);
    return this.findOne(id);
  }

  async remove(id: number, requestingUser: RequestingUser): Promise<void> {
    const notification = await this.findOne(id);

    if (
      requestingUser.role !== 'ADMIN' &&
      notification.userId !== requestingUser.id
    ) {
      throw new ForbiddenException(
        'Vous ne pouvez supprimer que vos propres notifications',
      );
    }

    await this.notificationRepository.delete(id);
  }

  async markAsRead(id: number, userId: number): Promise<Notification> {
    const notification = await this.findOne(id);

    if (notification.userId !== userId) {
      throw new ForbiddenException('Cette notification ne vous appartient pas');
    }

    notification.isLue = true;
    notification.dateLecture = new Date();
    notification.statut = NotificationStatut.LUE;

    return this.notificationRepository.save(notification);
  }

  async markAllAsRead(userId: number): Promise<{ updated: number }> {
    const result = await this.notificationRepository.update(
      { userId, isLue: false },
      {
        isLue: true,
        dateLecture: new Date(),
        statut: NotificationStatut.LUE,
      },
    );

    return { updated: result.affected ?? 0 };
  }

  async archiver(id: number, userId: number): Promise<Notification> {
    const notification = await this.findOne(id);

    if (notification.userId !== userId) {
      throw new ForbiddenException('Cette notification ne vous appartient pas');
    }

    notification.isArchivee = true;
    return this.notificationRepository.save(notification);
  }

  async desarchiver(id: number, userId: number): Promise<Notification> {
    const notification = await this.findOne(id);

    if (notification.userId !== userId) {
      throw new ForbiddenException('Cette notification ne vous appartient pas');
    }

    notification.isArchivee = false;
    return this.notificationRepository.save(notification);
  }

  async sendToAdmins(data: {
    type: NotificationType;
    titre: string;
    message: string;
    priorite?: NotificationPriorite;
    metadata?: any;
  }): Promise<Notification[]> {
    const admins = await this.userRepository.find({
      where: { role: { name: 'ADMIN' } },
      relations: { role: true },
    });

    const dtos: CreateNotificationDto[] = admins.map((admin) => ({
      type: data.type,
      titre: data.titre,
      message: data.message,
      priorite: data.priorite ?? NotificationPriorite.NORMALE,
      canal: NotificationCanal.IN_APP,
      userId: admin.id,
      metadata: data.metadata,
    }));

    return this.createBulk(dtos);
  }

  async cleanOldNotifications(
    daysOld: number = 30,
  ): Promise<{ deleted: number }> {
    const dateLimit = new Date();
    dateLimit.setDate(dateLimit.getDate() - daysOld);

    const result = await this.notificationRepository.delete({
      isLue: true,
      createdAt: LessThan(dateLimit),
    });

    this.logger.log(
      `🧹 Nettoyage: ${result.affected} notifications supprimées`,
    );

    return { deleted: result.affected ?? 0 };
  }

  async getStatistics() {
    const notifications = await this.notificationRepository.find();

    const byType = {} as Record<NotificationType, number>;
    const byCanal = {} as Record<NotificationCanal, number>;
    const byStatut = {} as Record<NotificationStatut, number>;
    const byPriorite = {} as Record<NotificationPriorite, number>;

    Object.values(NotificationType).forEach((t) => (byType[t] = 0));
    Object.values(NotificationCanal).forEach((c) => (byCanal[c] = 0));
    Object.values(NotificationStatut).forEach((s) => (byStatut[s] = 0));
    Object.values(NotificationPriorite).forEach((p) => (byPriorite[p] = 0));

    notifications.forEach((n) => {
      byType[n.type] = (byType[n.type] || 0) + 1;
      byCanal[n.canal] = (byCanal[n.canal] || 0) + 1;
      byStatut[n.statut] = (byStatut[n.statut] || 0) + 1;
      byPriorite[n.priorite] = (byPriorite[n.priorite] || 0) + 1;
    });

    return {
      total: notifications.length,
      nonLues: notifications.filter((n) => !n.isLue).length,
      lues: notifications.filter((n) => n.isLue).length,
      archivees: notifications.filter((n) => n.isArchivee).length,
      byType,
      byCanal,
      byStatut,
      byPriorite,
    };
  }
}