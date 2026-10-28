import {
  Entity, Column, PrimaryGeneratedColumn, ManyToOne,
  JoinColumn, CreateDateColumn,
  Index,
} from 'typeorm';
import { Route } from './route.entity';
import { Location } from './location.entity';

export enum RouteStopType {
  DEPART = 'DEPART',
  INTERMEDIAIRE = 'INTERMEDIAIRE',
  ARRIVEE = 'ARRIVEE',
}

@Entity('route_stops')
@Index(['routeId', 'ordre'], { unique: true })
export class RouteStop {
  @PrimaryGeneratedColumn()
  id!: number;

  // ══════════════════════════════════════════════════════════
  // ROUTE PARENTE
  // ══════════════════════════════════════════════════════════
  @ManyToOne(() => Route, (r) => r.stops, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'routeId' })
  route!: Route;

  @Column({ type: 'int' })
  routeId!: number;
  
  @ManyToOne(() => Location, { onDelete: 'RESTRICT', eager: true })
  @JoinColumn({ name: 'locationId' })
  location!: Location;

  @Column({ type: 'int' })
  locationId!: number;

  // ══════════════════════════════════════════════════════════
  // ORDRE & TYPE
  // ══════════════════════════════════════════════════════════
  @Column({ type: 'int' })
  ordre!: number;   // 0 = départ, 1..N-1 = intermédiaires, N = arrivée

  @Column({ type: 'enum', enum: RouteStopType, default: RouteStopType.INTERMEDIAIRE })
  type!: RouteStopType;

  // ══════════════════════════════════════════════════════════
  // TIMING (relatif au départ)
  // ══════════════════════════════════════════════════════════
  @Column({ type: 'int', nullable: true })
  heureDepartRel?: number;      // minutes depuis le départ

  @Column({ type: 'int', nullable: true })
  heureArriveeRel?: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  distanceDepuisDepart?: number; // km cumulés

  @Column({ nullable: true, length: 255 })
  description?: string;

  @CreateDateColumn()
  createdAt!: Date;
}