import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, OneToMany,JoinColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { Societe } from './societe.entity';
import { Vehicule } from './vehicule.entity';
import { Route } from './route.entity';

export enum MoyenTransType {
  BUS = 'BUS',
  TRAIN = 'TRAIN',
  BATEAU = 'BATEAU',
  AVION = 'AVION',
  TAXI = 'TAXI',
  TAXI_BROUSSE = 'TAXI_BROUSSE',
  FERRY = 'FERRY',
  CAMION = 'CAMION',
}

@Entity('moyens_trans')
@Index(['societeId', 'isActif'])
export class MoyenTrans {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'enum', enum: MoyenTransType })
  type!: MoyenTransType;

  @Column()
  nom!: string; // Ex: "Bus Express", "Train Premium"

  @Column({ nullable: true })
  description?: string;

  @Column({ default: true })
  isActif!: boolean;

  @ManyToOne(() => Societe, (societe) => societe.moyensTrans)
  @JoinColumn({ name: 'societeId' })
  societe!: Societe;

  @Column()
  societeId!: number;

  @OneToMany(() => Vehicule, vehicule => vehicule.moyenTrans)
  vehicules!: Vehicule[];

  @OneToMany(() => Route, route => route.moyenTrans)
  routes!: Route[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}