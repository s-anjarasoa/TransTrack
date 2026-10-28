export type NotificationPriorite = 'BASSE' | 'NORMALE' | 'HAUTE' | 'URGENTE';

export type NotificationType =
  | 'SYSTEME' | 'ABONNEMENT' | 'PAIEMENT' | 'RESERVATION' | 'VOYAGE' | 'BILLET'
  | 'VALIDATION_AGENT' | 'VALIDATION_SOCIETE' | 'MESSAGE' | 'ALERTE';

export interface AppNotification {
  id: number;
  type: NotificationType;
  titre: string;
  message: string;
  priorite: NotificationPriorite;
  isLue: boolean;
  createdAt: string;
  metadata?: { entityType?: string; entityId?: number; actionUrl?: string; actionLabel?: string };
}