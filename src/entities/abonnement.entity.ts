import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  BeforeInsert,
} from 'typeorm';
import { Societe } from './societe.entity';
import { Paiement } from './paiement.entity';
import { numericTransformer } from 'src/common/utils/numeric.transformer';

export enum AbonnementType {
  MENSUEL = 'MENSUEL',
  ANNUELLE = 'ANNUELLE',
}

export const ABONNEMENT_TARIFS = {
  [AbonnementType.MENSUEL]: 100000,
  [AbonnementType.ANNUELLE]: 1200000,
};

/**
 * Règle : un abonnement est créé INACTIF (isActif = false, dateDebut vide) =
 * « en attente de paiement ». Il n'est activé (isActif = true, dates
 * renseignées) qu'après un paiement VALIDE, voir SubscriptionsService.
 */
@Entity('abonnements')
export class Abonnement {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'enum', enum: AbonnementType })
  type!: AbonnementType;

  @ManyToOne(() => Societe, (societe) => societe.abonnements)
  @JoinColumn({ name: 'societeId' })
  societe!: Societe;

  @Column()
  societeId!: number;

  @Column({
    type: 'decimal',
    precision: 15,
    scale: 0,
    nullable: false,
    default: 0,
    transformer: numericTransformer,
  })
  tarif!: number;

  @Column({ default: false })
  isActif!: boolean;

  @Column({ type: 'date', nullable: true })
  dateDebut?: Date;

  @Column({ type: 'date', nullable: true })
  dateFin?: Date;

  // ✅ Paiements liés à cet abonnement (tentatives en ligne, paiements manuels)
  @OneToMany(() => Paiement, (paiement) => paiement.abonnement)
  paiements!: Paiement[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Le prix vient toujours du serveur, jamais du client
  @BeforeInsert()
  setTarifFromType(): void {
    this.tarif = ABONNEMENT_TARIFS[this.type];
  }
}