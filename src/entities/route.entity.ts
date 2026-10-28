import {
  Entity, Column, PrimaryGeneratedColumn, ManyToOne, OneToMany,
  JoinColumn, CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm';
import { Societe } from './societe.entity';
import { MoyenTrans } from './moyen-trans.entity';
import { Voyage } from './voyage.entity';
import { Tarif } from './tarif.entity';
import { RouteStop } from './route-stop.entity';

export enum RouteStatut {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDUE = 'SUSPENDUE',
}

@Entity('routes')
@Index(['societeId', 'statut'])
@Index(['depart', 'arrivee'])
export class Route {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 150, nullable: true })
  nom?: string;   

  @Column({ length: 150 })
  depart!: string;

  @Column({ length: 150 })
  arrivee!: string;

  @Column({ nullable: true, length: 255 })
  pointDepart?: string;

  @Column({ nullable: true, length: 255 })
  pointArrivee?: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  distance?: number;   

  @Column({ nullable: true })
  dureeEstimee?: number;   

  @Column({ type: 'enum', enum: RouteStatut, default: RouteStatut.ACTIVE })
  statut!: RouteStatut;

  @Column({ nullable: true, type: 'text' })
  description?: string;

  @ManyToOne(() => Societe, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'societeId' })
  societe?: Societe;

  @Column({ type: 'int', nullable: true })
  societeId?: number;

  @ManyToOne(() => MoyenTrans, (moyenTrans) => moyenTrans.routes, {
    eager: true,
  })
  @JoinColumn({ name: 'moyenTransId' })
  moyenTrans!: MoyenTrans;

  @Column()
  moyenTransId!: number;

  @OneToMany(() => RouteStop, (s) => s.route, {
    cascade: true,
    eager: true,
  })
  stops!: RouteStop[];

  @OneToMany(() => Voyage, (voyage) => voyage.route)
  voyages!: Voyage[];

  @OneToMany(() => Tarif, (tarif) => tarif.route)
  tarifs!: Tarif[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}