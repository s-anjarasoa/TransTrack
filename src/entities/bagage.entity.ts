import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Reservation } from './reservation.entity';

export enum BagageType {
  MAIN = 'MAIN',
  CABINE = 'CABINE',
  SOUTE = 'SOUTE',
  SPECIAL = 'SPECIAL',
}

@Entity('bagages')
export class Bagage {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'enum', enum: BagageType })
  type!: BagageType;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  poids!: number; // En kg

  @Column({ nullable: true })
  description?: string;

  @Column({ type: 'decimal', precision: 15, scale: 0, default: 0 })
  supplementPrix!: number; // Supplément en Ariary

  @Column({ unique: true })
  numeroEtiquette!: string; // Ex: "BAG-2026-000001"

  @ManyToOne(() => Reservation, { nullable: false })
  @JoinColumn({ name: 'reservationId' })
  reservation!: Reservation;

  @Column()
  reservationId!: number;

  @CreateDateColumn()
  createdAt!: Date;
}