import {Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn,} from 'typeorm';
import { Voyage, VoyageStatut } from './voyage.entity';
import { Agent } from './agent.entity';

@Entity('voyage_status_history')
export class VoyageStatusHistory {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Voyage, (v) => v.statusHistory, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'voyageId' })
  voyage!: Voyage;

  @Column({ name: 'voyageId', type: 'int' })
  voyageId!: number;

  @Column({ type: 'varchar', length: 20, nullable: true })
  ancienStatut?: VoyageStatut | null;

  @Column({ type: 'varchar', length: 20 })
  nouveauStatut!: VoyageStatut;

  @Column({ type: 'text', nullable: true })
  motif?: string | null;

  @ManyToOne(() => Agent, { nullable: true })
  @JoinColumn({ name: 'agentId' })
  agent?: Agent;

  @Column({ name: 'agentId', type: 'int', nullable: true })
  agentId?: number | null;

  @CreateDateColumn()
  createdAt!: Date;
}