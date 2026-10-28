
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

import { Voyage } from './voyage.entity';

@Entity('vehicule_positions')
@Index(['voyageId', 'datePosition'])
export class VehiculePosition {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  voyageId!: number;

  @ManyToOne(() => Voyage, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'voyageId' })
  voyage!: Voyage;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  latitude!: string;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  longitude!: string;

  @Column({
    type: 'double precision',
    nullable: true,
  })
  precision?: number | null;

  @CreateDateColumn({ type: 'timestamptz' })
  datePosition!: Date;
}
