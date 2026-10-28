import {
  Entity, Column, PrimaryGeneratedColumn, ManyToOne, OneToMany,
  JoinColumn, CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm';
import { Societe } from './societe.entity';

export enum LocationType {
  CITY = 'CITY',
  VILLAGE = 'VILLAGE',
  STATION = 'STATION',       // Gare routière
  PORT = 'PORT',             // Port maritime
  AIRPORT = 'AIRPORT',       // Aéroport
  TRAINSTATION = 'TRAINSTATION',
  STOP = 'STOP',             // Arrêt libre
}

@Entity('locations')
@Index(['latitude', 'longitude'])
@Index(['province'])
export class Location {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 150 })
  name!: string;

  @Column({ type: 'enum', enum: LocationType, default: LocationType.CITY })
  type!: LocationType;

  @Column({ nullable: true, length: 100 })
  province?: string;

  @Column({ nullable: true, length: 100 })
  region?: string;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  latitude?: number;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  longitude?: number;

  @Column({ nullable: true, length: 255 })
  address?: string;

  @Column({ default: true })
  isActive!: boolean;

  // Multi-tenant : nullable pour villes partagées (Antananarivo, etc.)
  @ManyToOne(() => Societe, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'societeId' })
  societe?: Societe;

  @Column({ type: 'int', nullable: true })
  societeId?: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}