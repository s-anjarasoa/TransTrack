import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, OneToMany, OneToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Exclude } from 'class-transformer';
import { Role } from './role.entity';
import { Client } from './client.entity';
import { Agent } from './agent.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true })
  email!: string;

  @Column()
  @Exclude()
  password!: string;

  @Column({ nullable: true })
  firstName!: string;

  @Column({ nullable: true })
  lastName!: string;

  @ManyToOne(() => Role, role => role.users)
  role!: Role;

  @Column()
  roleId!: number;

  @Column({ default: true })
  isActive!: boolean;

  // ✅ AJOUTER ce champ
  @Column({ default: false })
  profileCompleted!: boolean;

  @Column({ nullable: true })
  lastLogin!: Date;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @OneToOne(() => Client, (client) => client.user)
  client!: Client;

  @OneToOne(() => Agent, (agent) => agent.user)
  agent!: Agent;
}