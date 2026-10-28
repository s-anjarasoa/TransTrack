import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, OneToMany, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Agent } from './agent.entity';
import { Abonnement } from './abonnement.entity';
import { MoyenTrans } from './moyen-trans.entity';
import { Tarif } from './tarif.entity';
import { Voyage } from './voyage.entity';
import { Vehicule } from './vehicule.entity';

export enum SocieteStatut {
  EN_ATTENTE = 'EN_ATTENTE',
  VALIDEE = 'VALIDEE',
  REJETEE = 'REJETEE',
  SUSPENDUE = 'SUSPENDUE',
}

@Entity('societes')
export class Societe {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @Column()
  phone!: string;

  @Column()
  email!: string;

  @Column()
  address!: string;

  @Column()
  nif!: string;

  @Column()
  numState!: string;

  @Column({ type: 'enum', enum: SocieteStatut, default: SocieteStatut.EN_ATTENTE })
  statut!: SocieteStatut;

  @Column({ unique: true, nullable: true })
  codeInvitation?: string;

  @ManyToOne(() => Agent, { nullable: false })
  @JoinColumn({ name: 'directeurId' })
  directeur!: Agent;

  @Column()
  directeurId!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @OneToMany(() => Agent, (agent) => agent.societe)
  agents!: Agent[];

  @OneToMany(() => Abonnement, (abonnement) => abonnement.societe)
  abonnements!: Abonnement[];

  @OneToMany(() => MoyenTrans, moyenTrans => moyenTrans.societe)
  moyensTrans!: MoyenTrans[];

  @OneToMany(() => Tarif, tarif => tarif.societe)
  tarifs!: Tarif[];

  @OneToMany(() => Vehicule, vehicule => vehicule.societe)
  vehicules!: Vehicule[];

  @OneToMany(() => Voyage, voyage => voyage.societe)
 voyages!: Voyage[];
}