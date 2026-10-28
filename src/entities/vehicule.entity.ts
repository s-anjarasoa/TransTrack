import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, OneToMany, JoinColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { Societe } from './societe.entity';
import { MoyenTrans } from './moyen-trans.entity';
import { Voyage } from './voyage.entity';

export enum VehiculeStatut {
  DISPONIBLE = 'DISPONIBLE',
  EN_SERVICE = 'EN_SERVICE',
  EN_MAINTENANCE = 'EN_MAINTENANCE',
  HORS_SERVICE = 'HORS_SERVICE',
}

@Entity('vehicules')
@Index(['societeId', 'statut'])
export class Vehicule {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true })
  immatriculation!: string;

  @Column()
  marque!: string;

  @Column()
  modele!: string;

  @Column({ nullable: true })
  annee?: number;

  @Column()
  capacite!: number;

  @Column({ type: 'enum', enum: VehiculeStatut, default: VehiculeStatut.DISPONIBLE })
  statut!: VehiculeStatut;

  @Column({ nullable: true })
  couleur?: string;

  @Column({ nullable: true })
  numeroChassis?: string;

  @Column({ type: 'date', nullable: true })
  dateAssurance?: Date;

  @Column({ type: 'date', nullable: true })
  dateVisiteTechnique?: Date;

  @Column({ default: true })
  isActif!: boolean;

  @ManyToOne(() => Societe, (societe) => societe.vehicules)
  @JoinColumn({ name: 'societeId' })
  societe!: Societe;

  @Column()
  societeId!: number;

  @ManyToOne(() => MoyenTrans, (moyenTrans) => moyenTrans.vehicules)
  @JoinColumn({ name: 'moyenTransId' })
  moyenTrans!: MoyenTrans;

  @Column()
  moyenTransId!: number;

  @OneToMany(() => Voyage, (voyage) => voyage.vehicule)
  voyages!: Voyage[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}