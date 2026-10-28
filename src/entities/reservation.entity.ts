// src/entities/reservation.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, JoinColumn, ManyToOne, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Client } from './client.entity';
import { Voyage } from './voyage.entity';
import { Societe } from './societe.entity';
import { Billet } from './billet.entity';
import { Paiement } from './paiement.entity';
import { TarifCategorie } from './tarif.entity';

export enum ReservationStatut {
  EN_ATTENTE = 'EN_ATTENTE',
  CONFIRMEE = 'CONFIRMEE',
  PAYEE = 'PAYEE',
  ANNULEE = 'ANNULEE',
  REMBOURSEE = 'REMBOURSEE',
  TERMINEE = 'TERMINEE',
}

export enum ReservationSource {
  EN_LIGNE = 'EN_LIGNE',
  GUICHET = 'GUICHET',
  TELEPHONE = 'TELEPHONE',
  AGENCE = 'AGENCE',
}

@Entity('reservations')
export class Reservation {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true })
  codeReservation!: string; // Ex: "RES-2026-0001"

  @Column()
  nombrePlaces!: number;

  @Column({ type: 'decimal', precision: 15, scale: 0 })
  prixTotal!: number; // En Ariary

  // ✅ NOUVEAU : Catégorie choisie (si le voyage est mixte)
  @Column({ type: 'enum', enum: TarifCategorie, nullable: true })
  categorie?: TarifCategorie;

  // ✅ NOUVEAU : Sièges sélectionnés (si vous activez le plan de sièges)
  @Column({ type: 'simple-array', nullable: true })
  sieges?: string[];

  @Column({ type: 'enum', enum: ReservationStatut, default: ReservationStatut.EN_ATTENTE })
  statut!: ReservationStatut;

  @Column({ type: 'enum', enum: ReservationSource, default: ReservationSource.EN_LIGNE })
  source!: ReservationSource;

  @Column({ type: 'timestamp' })
  dateReservation!: Date;

  @Column({ type: 'timestamp', nullable: true })
  dateConfirmation?: Date;

  @Column({ type: 'timestamp', nullable: true })
  dateAnnulation?: Date;

  @Column({ nullable: true })
  motifAnnulation?: string;

  @Column({ nullable: true })
  notes?: string;

  @ManyToOne(() => Client, (client) => client.reservations)
  @JoinColumn({ name: 'clientId' })
  client!: Client;

  @Column()
  clientId!: number;

  @ManyToOne(() => Voyage, (voyage) => voyage.reservations)
  @JoinColumn({ name: 'voyageId' })
  voyage!: Voyage;

  @Column()
  voyageId!: number;
  
  @OneToMany(() => Billet, billet => billet.reservation)
  billets!: Billet[];

  @OneToMany(() => Paiement, paiement => paiement.reservation)
  paiements!: Paiement[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @Column({ type: 'jsonb', nullable: true })
  recommendationContext?: {
  proposals: { voyageId: number; scores: any }[];
  chosenIndex: number;
};
}