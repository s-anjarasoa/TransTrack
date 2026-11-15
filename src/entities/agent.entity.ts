import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  OneToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';
import { Status, AgentStatus } from './status.entity';
import { User } from './user.entity';
import { Societe } from './societe.entity';

export enum AgentType {
  RECEPTIONNISTE = 'RECEPTIONNISTE',
  CHAUFFEUR = 'CHAUFFEUR',
  CAISSIER = 'CAISSIER',
  GERANT = 'GERANT',
  DIRECTEUR = 'DIRECTEUR',
}

@Entity('agents')
export class Agent {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  CIN!: string;

  @Column({ nullable: true })
  phone!: string;

  @Column({ nullable: true })
  address!: string;

  @OneToOne(() => User, (user) => user.agent)
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column({ unique: true, type: 'int' })
  userId!: number;

  @Column({ type: 'enum', enum: AgentType, default: AgentType.RECEPTIONNISTE })
  type!: AgentType;

  @ManyToOne(() => Societe, (societe) => societe.agents, { nullable: true })
  @JoinColumn({ name: 'societeId' })
  societe?: Societe;

  @Column({ type: 'int', nullable: true })
  societeId?: number;

  @Column({ type: 'enum', enum: AgentStatus, default: AgentStatus.EN_ATTENTE })
  status!: AgentStatus;

  @Column({ type: 'varchar', length: 64, nullable: true })
  codeHash!: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  codeExpiresAt!: Date | null;

  @Column({ type: 'int', default: 0 })
  codeAttempts!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @DeleteDateColumn({ type: 'timestamp', nullable: true })
  deletedAt: Date | null;

  @OneToMany(() => Status, (status) => status.agent)
  statusHistory!: Status[];
}