import { Entity, Column, PrimaryGeneratedColumn, OneToOne, OneToMany, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from './user.entity';
import { Reservation } from './reservation.entity';

@Entity('clients')
export class Client {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ nullable: true })
  phone!: string;

  @Column()
  address!: string;

  @Column({ unique: true })
  CIN!: string;

  @Column({ nullable: true })
  passport!: string;

  @OneToOne(() => User, (user) => user.client)
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column({ unique: true })
  userId!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @OneToMany(() => Reservation, (reservation) => reservation.client)
  reservations!: Reservation[];

  @Column({ type: 'jsonb', nullable: true })
  preferences?: { distance: number; duration: number; price: number };
}