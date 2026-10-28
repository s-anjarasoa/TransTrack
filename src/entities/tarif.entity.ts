import { Entity, Column, PrimaryGeneratedColumn, ManyToOne,JoinColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { Route } from './route.entity';
import { Societe } from './societe.entity';

export enum TarifCategorie {
  CLASSE = 'CLASSE',
  ECONOMIE = 'ECONOMIE',
}

export enum TarifType {
  NORMAL = 'NORMAL',
  PROMOTION = 'PROMOTION',
}

@Entity('tarifs')
@Index(['routeId', 'categorie'])
export class Tarif {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'enum', enum: TarifCategorie, default: TarifCategorie. ECONOMIE })
  categorie!: TarifCategorie;

  @Column({ type: 'enum', enum: TarifType, default: TarifType.NORMAL })
  type!: TarifType;

  @Column({ type: 'decimal', precision: 15, scale: 0 })
  prix!: number; // En Ariary

  @Column({ type: 'decimal', precision: 15, scale: 0, nullable: true })
  prixPromo?: number; // Prix promotionnel

  @Column({ type: 'date', nullable: true })
  dateDebut?: Date;

  @Column({ type: 'date', nullable: true })
  dateFin?: Date;

  @Column({ default: true })
  isActif!: boolean;

  @ManyToOne(() => Route, (route) => route.tarifs)
  @JoinColumn({ name: 'routeId' })
  route!: Route;

  @Column()
  routeId!: number;

  @ManyToOne(() => Societe, (societe) => societe.tarifs)
  @JoinColumn({ name: 'societeId' })
  societe!: Societe;

  @Column()
  societeId!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}