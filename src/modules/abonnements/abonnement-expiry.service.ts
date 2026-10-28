import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { NotificationsService } from '../notifications/notifications.service';
import {
  NotificationPriorite,
  NotificationType,
} from '../../entities/notification.entity';
import { activeSubscriptionSql } from '../../common/utils/subscription.util';

// Fréquence de vérification (en plus d'une vérification peu après le démarrage)
const CHECK_INTERVAL_MS = 60 * 60 * 1000; // 1 heure

/**
 * Passe en SUSPENDUE toute société VALIDEE qui n'est plus couverte par un
 * abonnement actif, en attendant le renouvellement.
 *
 * Sans dépendance supplémentaire (pas de @nestjs/schedule). La visibilité
 * publique reste, elle, calculée à chaque requête : une société expirée
 * disparaît des listes immédiatement, même avant ce passage.
 */
@Injectable()
export class AbonnementExpiryService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AbonnementExpiryService.name);
  private timer: NodeJS.Timeout | null = null;
  private startTimer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(
    @InjectDataSource() private dataSource: DataSource,
    private notificationsService: NotificationsService,
  ) {}

  onModuleInit(): void {
    this.startTimer = setTimeout(() => void this.run(), 15_000);
    this.startTimer.unref();

    this.timer = setInterval(() => void this.run(), CHECK_INTERVAL_MS);
    this.timer.unref();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
    if (this.startTimer) clearTimeout(this.startTimer);
  }

  /** Retourne le nombre de sociétés suspendues */
  async run(): Promise<number> {
    if (this.running) return 0;
    this.running = true;

    try {
      return await this.suspendExpiredSocietes();
    } catch (error: any) {
      this.logger.error(`Vérification des abonnements échouée : ${error?.message}`);
      return 0;
    } finally {
      this.running = false;
    }
  }

  private async suspendExpiredSocietes(): Promise<number> {
    // WITH ... UPDATE ... RETURNING puis SELECT : le driver renvoie ainsi
    // directement les lignes (un UPDATE seul renverrait [lignes, nombre]).
    const rows: { id: number; name: string; userId: number }[] =
      await this.dataSource.query(`
        WITH suspended AS (
          UPDATE societes s
          SET statut = 'SUSPENDUE', "updatedAt" = now()
          WHERE s.statut = 'VALIDEE'
            AND NOT ${activeSubscriptionSql('s')}
          RETURNING s.id, s.name, s."directeurId"
        )
        SELECT sp.id, sp.name, a."userId"
        FROM suspended sp
        JOIN agents a ON a.id = sp."directeurId"
      `);

    for (const row of rows) {
      this.logger.warn(`Société ${row.id} (${row.name}) → SUSPENDUE : abonnement expiré`);

      try {
        await this.notificationsService.notifyUsers([row.userId], {
          type: NotificationType.VALIDATION_SOCIETE,
          titre: 'Société suspendue : abonnement expiré',
          message: `L'abonnement de ${row.name} a expiré. Votre société est suspendue jusqu'au renouvellement.`,
          priorite: NotificationPriorite.HAUTE,
          societeId: row.id,
          metadata: {
            entityType: 'societe',
            entityId: row.id,
            actionUrl: '/abonnements/souscrire',
            actionLabel: 'Renouveler',
          },
        });
      } catch (error: any) {
        this.logger.error(`Notification de suspension ${row.id} : ${error?.message}`);
      }
    }

    return rows.length;
  }
}