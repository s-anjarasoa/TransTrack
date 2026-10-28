import {
  Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index,
} from 'typeorm';

export enum RoutingCriteria {
  DISTANCE = 'DISTANCE',
  DUREE = 'DUREE',
  PRIX = 'PRIX',
}

export enum RoutingAlgorithm {
  A_STAR = 'A_STAR',
  DIJKSTRA = 'DIJKSTRA',
}

@Entity('routing_logs')
@Index(['createdAt'])
@Index(['startLocationId', 'endLocationId'])
@Index(['algorithm', 'criteria'])
export class RoutingLog {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  startLocationId!: number;

  @Column()
  endLocationId!: number;

  @Column({ type: 'enum', enum: RoutingCriteria })
  criteria!: RoutingCriteria;

  @Column({ type: 'enum', enum: RoutingAlgorithm })
  algorithm!: RoutingAlgorithm;

  @Column({ type: 'decimal', precision: 10, scale: 3 })
  executionTimeMs!: number;

  @Column()
  nodesExplored!: number;

  @Column()
  pathLength!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  totalDistance!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  totalDuration!: number;

  @Column({ type: 'decimal', precision: 15, scale: 0 })
  totalCost!: number;

  @Column({ default: true })
  found!: boolean;

  @Column({ type: 'jsonb', nullable: true })
  pathJson?: { routeIds: number[]; nodeIds: number[] } | null;;

  @Column({ type: 'varchar', nullable: true, length: 500 })
  errorMessage?: string | null;

  @CreateDateColumn()
  createdAt!: Date;
}