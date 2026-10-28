import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, OneToMany, CreateDateColumn, UpdateDateColumn, JoinColumn, Index } from 'typeorm';
import { Societe } from './societe.entity';
import { Route } from './route.entity';
import { Vehicule } from './vehicule.entity';
import { Agent } from './agent.entity';
import { Reservation } from './reservation.entity';
import { VoyageStatusHistory } from './voyage-status-history.entity';
//import { VehiculePosition } from './vehiculePosition';

export enum VoyageStatut {
  PLANIFIE = 'PLANIFIE',
  EN_COURS = 'EN_COURS',
  TERMINE = 'TERMINE',
  ANNULE = 'ANNULE',
  RETARDE = 'RETARDE',
  COMPLET = 'COMPLET',
}

@Entity('voyages')
@Index(['societeId', 'dateDepart'])
@Index(['routeId', 'dateDepart'])
@Index(['vehiculeId', 'dateDepart'])
export class Voyage {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true })
  codeVoyage!: string; // Ex: "VYG-2026-001"

  @Column({ type: 'timestamp' })
  dateDepart!: Date;

  @Column({ type: 'timestamp' })
  dateArrivee!: Date;

  @Column({ type: 'decimal', precision: 15, scale: 0 })
  prix!: number; // Prix en Ariary

  @Column()
  placesTotales!: number;

  @Column()
  placesDisponibles!: number;

  @Column({ type: 'enum', enum: VoyageStatut, default: VoyageStatut.PLANIFIE })
  statut!: VoyageStatut;

  @Column({ nullable: true })
  retardMinutes?: number;

  @Column({ nullable: true })
  motifAnnulation?: string;

  @Column({ nullable: true })
  notes?: string;

  @ManyToOne(() => Societe, (societe) => societe.voyages)
  @JoinColumn({ name: 'societeId' })
  societe!: Societe;

  @Column()
  societeId!: number;

  @ManyToOne(() => Route, (route) => route.voyages)
  @JoinColumn({ name: 'routeId' })
  route!: Route;

  @Column()
  routeId!: number;

  @ManyToOne(() => Vehicule, (vehicule) => vehicule.voyages)
  @JoinColumn({ name: 'vehiculeId' })
  vehicule!: Vehicule;

  @Column()
  vehiculeId!: number;

  @ManyToOne(() => Agent, { nullable: true })
  @JoinColumn({ name: 'chauffeurId' })
  chauffeur?: Agent;

  @Column({ nullable: true })
  chauffeurId?: number;

  @OneToMany(() => Reservation, reservation => reservation.voyage)
  reservations!: Reservation[];

  @OneToMany(() => VoyageStatusHistory, (h) => h.voyage)
  statusHistory!: VoyageStatusHistory[];

  /*@OneToMany(() => VehiculePosition,(position) => position.voyage,)
  positions!: VehiculePosition[];*/

  // ... dans la classe Voyage
  @Column({ nullable: true })
  prixClasse?: number;

  @Column({ nullable: true })
  prixEconomie?: number;

  @Column({ default: 0 })
  placesClasseTotales!: number;

  @Column({ default: 0 })
  placesClasseDisponibles!: number;

  @Column({ default: 0 })
  placesEconomieTotales!: number;

  @Column({ default: 0 })
  placesEconomieDisponibles!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  iaScore?: number;
}