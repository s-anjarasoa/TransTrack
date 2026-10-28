import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, CreateDateColumn } from 'typeorm';
import { Agent } from './agent.entity';
import { User } from './user.entity';

export enum AgentStatus {
  EN_ATTENTE = 'EN_ATTENTE',
  VALIDE = 'VALIDE',
  REJETE = 'REJETE',
  SUSPENDU = 'SUSPENDU',
  DESACTIVE = 'DESACTIVE',
  PRE_VALIDE = 'PRE_VALIDE',
}

@Entity('status')
export class Status {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Agent, agent => agent.statusHistory)
  agent!: Agent;

  @Column()
  agentId!: number;

  @Column({ 
    type: 'enum', 
    enum: AgentStatus 
  })
  status!: AgentStatus;

  @Column({ default: false })
  isActive!: boolean;

  @ManyToOne(() => User, { nullable: true })
  changedBy?: User;

  @Column({ nullable: true })
  changedByUserId?: number;

  @Column({ nullable: true })
  reason?: string;

  @Column({ nullable: true })
  suspendedUntil?: Date;

  @CreateDateColumn()
  createdAt!: Date;
}