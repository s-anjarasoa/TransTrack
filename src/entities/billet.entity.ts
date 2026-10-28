import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Reservation } from './reservation.entity';
import { Client } from './client.entity';

export enum BilletStatut {
  VALIDE = 'VALIDE',
  UTILISE = 'UTILISE',
  ANNULE = 'ANNULE',
  EXPIRE = 'EXPIRE',
}

export enum BilletCategorie {
  ADULTE = 'ADULTE',
  ENFANT = 'ENFANT',
  ETUDIANT = 'ETUDIANT',
  SENIOR = 'SENIOR',
  VIP = 'VIP',
}

@Entity('billets')
export class Billet {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true })
  numeroBillet!: string; // Ex: "BLT-2026-000001"

  @Column({ nullable: true })
  numeroPlace?: string; // Ex: "12A"

  @Column({ type: 'enum', enum: BilletCategorie, default: BilletCategorie.ADULTE })
  categorie!: BilletCategorie;

  @Column({ type: 'enum', enum: BilletStatut, default: BilletStatut.VALIDE })
  statut!: BilletStatut;

  @Column({ type: 'decimal', precision: 15, scale: 0 })
  prix!: number;

  @Column({ nullable: true })
  qrCode?: string; // Code QR pour validation

  @Column({ type: 'timestamp', nullable: true })
  dateUtilisation?: Date;

  @Column({ nullable: true })
  passagerNom?: string; // Nom du passager si différent du client

  @Column({ nullable: true })
  passagerCIN?: string;

  @Column({ nullable: true })
  passagerTelephone?: string;

  @ManyToOne(() => Reservation, (reservation) => reservation.billets)
  @JoinColumn({ name: 'reservationId' })
  reservation!: Reservation;

  @Column()
  reservationId!: number;

  @ManyToOne(() => Client, { nullable: true })
  @JoinColumn({ name: 'clientId' })
  client?: Client;

  @Column({ nullable: true })
  clientId?: number;

  @CreateDateColumn()
  createdAt!: Date;
}