import { Injectable, OnModuleInit, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from '../../entities/role.entity';
import { User } from '../../entities/user.entity';

@Injectable()
export class RolesService implements OnModuleInit {
  private readonly logger = new Logger(RolesService.name);

  constructor(
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async onModuleInit() {
    await this.initializeDefaultRoles();
  }

  private async initializeDefaultRoles() {
    const defaultRoles = [
      // ✅ AJOUTER : Rôle PENDING (utilisateur en attente de complétion)
      { name: 'PENDING', description: 'Utilisateur en attente de complétion de profil', isDefault: false },
      { name: 'ADMIN', description: 'Administrateur', isDefault: false },
      { name: 'AGENT', description: 'Agent', isDefault: false },
      { name: 'CLIENT', description: 'Client', isDefault: true },
    ];

    for (const roleData of defaultRoles) {
      const existing = await this.roleRepository.findOne({
        where: { name: roleData.name },
      });

      if (!existing) {
        await this.roleRepository.save(roleData);
        this.logger.log(` Rôle ${roleData.name} créé`);
      }
    }
  }
 
  async getUserCount(): Promise<number> {
    return this.userRepository.count();
  }
  
  async getRoleByRegistrationOrder(): Promise<Role> {
    const userCount = await this.getUserCount();

    this.logger.log(`Nombre d'utilisateurs existants: ${userCount}`);

    if (userCount === 0) {
      // ✅ Premier utilisateur = ADMIN
      const adminRole = await this.roleRepository.findOne({
        where: { name: 'ADMIN' },
      });
      if (!adminRole) {
        throw new NotFoundException('Rôle ADMIN non trouvé');
      }
      this.logger.log(` Attribution du rôle ADMIN (1er utilisateur)`);
      return adminRole;
    }

    // ✅ Tous les suivants = PENDING (rôle définitif après complétion du profil)
    const pendingRole = await this.roleRepository.findOne({
      where: { name: 'PENDING' },
    });
    if (!pendingRole) {
      throw new NotFoundException('Rôle PENDING non trouvé');
    }
    this.logger.log(` Attribution du rôle PENDING (${userCount + 1}ème utilisateur)`);
    return pendingRole;
  }

  /**
   * Créer un nouveau rôle
   */
  async create(name: string, description?: string, isDefault: boolean = false): Promise<Role> {
    const role = this.roleRepository.create({
      name,
      description,
      isDefault,
    });
    return this.roleRepository.save(role);
  }

  /**
   * Mettre à jour un rôle
   */
  async update(id: number, updateData: Partial<Role>): Promise<Role> {
    await this.roleRepository.update(id, updateData);
    const role = await this.findOne(id);
    if (!role) {
      throw new NotFoundException(`Rôle avec l'ID ${id} non trouvé`);
    }
    return role;
  }

  /**
   * Supprimer un rôle
   */
  async delete(id: number): Promise<void> {
    const result = await this.roleRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Rôle avec l'ID ${id} non trouvé`);
    }
  }

  async findAll(): Promise<Role[]> {
    return this.roleRepository.find();
  }

  async findOne(id: number): Promise<Role | null> {
    return this.roleRepository.findOne({ where: { id } });
  }

  async findByName(name: string): Promise<Role | null> {
    return this.roleRepository.findOne({ where: { name } });
  }
}