import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from './user.entity';
import { Societe } from './societe.entity';

export enum NotificationType {
  SYSTEME = 'SYSTEME',
  ABONNEMENT = 'ABONNEMENT',
  PAIEMENT = 'PAIEMENT',
  RESERVATION = 'RESERVATION',
  VOYAGE = 'VOYAGE',
  BILLET = 'BILLET',
  VALIDATION_AGENT = 'VALIDATION_AGENT',
  VALIDATION_SOCIETE = 'VALIDATION_SOCIETE',
  MESSAGE = 'MESSAGE',
  ALERTE = 'ALERTE',
}

export enum NotificationCanal {
  IN_APP = 'IN_APP',
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  PUSH = 'PUSH',
  WHATSAPP = 'WHATSAPP',
}

export enum NotificationPriorite {
  BASSE = 'BASSE',
  NORMALE = 'NORMALE',
  HAUTE = 'HAUTE',
  URGENTE = 'URGENTE',
}

export enum NotificationStatut {
  EN_ATTENTE = 'EN_ATTENTE',
  ENVOYEE = 'ENVOYEE',
  LIVREE = 'LIVREE',
  LUE = 'LUE',
  ECHOUEE = 'ECHOUEE',
  ANNULEE = 'ANNULEE',
}

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'enum', enum: NotificationType })
  type!: NotificationType;

  @Column()
  titre!: string;

  @Column({ type: 'text' })
  message!: string;

  @Column({ type: 'enum', enum: NotificationPriorite, default: NotificationPriorite.NORMALE })
  priorite!: NotificationPriorite;

  @Column({ type: 'enum', enum: NotificationStatut, default: NotificationStatut.EN_ATTENTE })
  statut!: NotificationStatut;

  @Column({ type: 'enum', enum: NotificationCanal, default: NotificationCanal.IN_APP })
  canal!: NotificationCanal;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'userId' })
  user?: User;

  @Column({ nullable: true })
  userId?: number;

  @ManyToOne(() => Societe, { nullable: true })
  @JoinColumn({ name: 'societeId' })
  societe?: Societe;

  @Column({ nullable: true })
  societeId?: number;

  // === MÉTADONNÉES ===
  @Column({ type: 'jsonb', nullable: true })
  metadata?: {
    entityType?: string;    // 'reservation', 'voyage', 'agent', 'societe'
    entityId?: number;      // ID de l'entité concernée
    actionUrl?: string;     // URL d'action (ex: '/reservations/123')
    actionLabel?: string;   // Label du bouton (ex: 'Voir')
    icon?: string;          // Icône
    color?: string;         // Couleur
  };

  // === SUIVI ===
  @Column({ type: 'timestamp', nullable: true })
  dateEnvoi?: Date;

  @Column({ type: 'timestamp', nullable: true })
  dateLecture?: Date;

  @Column({ default: false })
  isLue!: boolean;

  @Column({ default: false })
  isArchivee!: boolean;

  @Column({ nullable: true })
  erreurMessage?: string;

  // === TIMESTAMPS ===
  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}