import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Reservation } from './reservation.entity';
import { Abonnement } from './abonnement.entity';
import { numericTransformer } from 'src/common/utils/numeric.transformer';

export enum PaiementMethode {
  ESPECES = 'ESPECES',
  MOBILE_MONEY = 'MOBILE_MONEY', // MVola, Orange Money, Airtel Money
  CARTE_BANCAIRE = 'CARTE_BANCAIRE',
  VIREMENT = 'VIREMENT',
  CHEQUE = 'CHEQUE',
}

export enum PaiementStatut {
  EN_ATTENTE = 'EN_ATTENTE',
  VALIDE = 'VALIDE',
  ECHOUE = 'ECHOUE',
  REMBOURSE = 'REMBOURSE',
  ANNULE = 'ANNULE',
  EXPIRE = 'EXPIRE', // ✅ paiement en ligne non finalisé dans le délai
}

/**
 * Un paiement : soit enregistré manuellement (espèces, guichet…),
 * soit effectué EN LIGNE via une passerelle (simulée aujourd'hui, MVola /
 * Orange Money plus tard). Les paiements en ligne ont `provider` renseigné.
 *
 * Il règle UNE chose : une réservation OU un abonnement.
 */
@Entity('paiements')
export class Paiement {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true })
  reference!: string; // Ex: "PAY-2026-A1B2C3D4"

  @Column({
    type: 'decimal',
    precision: 15,
    scale: 0,
    transformer: numericTransformer,
  })
  montant!: number; // En Ariary

  @Column({ type: 'enum', enum: PaiementMethode })
  methode!: PaiementMethode;

  @Column({ type: 'enum', enum: PaiementStatut, default: PaiementStatut.EN_ATTENTE })
  statut!: PaiementStatut;

  // Paiement en ligne : date de création, puis date effective du paiement
  @Column({ type: 'timestamp' })
  datePaiement!: Date;

  @Column({ nullable: true })
  transactionId?: string; // ID de transaction externe (fournisseur)

  @Column({ nullable: true })
  numeroTelephone?: string; // Pour Mobile Money

  @Column({ nullable: true })
  numeroCarte?: string; // 4 derniers chiffres

  @Column({ nullable: true })
  notes?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: any;

  // ------------------------------------------------------------
  // Ce qui est payé : réservation OU abonnement (jamais les deux)
  // ------------------------------------------------------------
  // ⚠️ Nullable en base (un paiement d'abonnement n'a pas de réservation).
  // Le type TypeScript reste non-optionnel pour ne pas casser le code existant.
  @ManyToOne(() => Reservation, (reservation) => reservation.paiements, {
    nullable: true,
  })
  @JoinColumn({ name: 'reservationId' })
  reservation!: Reservation;

  @Column({ type: 'int', nullable: true })
  reservationId!: number;

  @ManyToOne(() => Abonnement, (abonnement) => abonnement.paiements, {
    nullable: true,
  })
  @JoinColumn({ name: 'abonnementId' })
  abonnement?: Abonnement;

  @Column({ type: 'int', nullable: true })
  abonnementId?: number;

  // ------------------------------------------------------------
  // Paiement EN LIGNE (null pour un paiement manuel)
  // ------------------------------------------------------------
  // 'simulated', 'mvola', 'orange_money'…
  @Column({ type: 'varchar', nullable: true })
  provider?: string | null;

  // Utilisateur qui paie
  @Column({ type: 'int', nullable: true })
  userId?: number | null;

  @Column({ type: 'varchar', default: 'MGA' })
  currency!: string;

  // Fin de validité de la page de paiement
  @Column({ type: 'timestamptz', nullable: true })
  expiresAt?: Date | null;

  // Chemin Angular où renvoyer l'utilisateur après paiement (ex. /abonnements)
  @Column({ type: 'varchar', nullable: true })
  returnPath?: string | null;

  // Date d'activation du service payé (abonnement, billet…)
  @Column({ type: 'timestamptz', nullable: true })
  fulfilledAt?: Date | null;

  @Column({ type: 'varchar', nullable: true })
  fulfillmentError?: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}