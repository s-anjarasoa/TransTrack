import { Injectable, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vehicule } from '../../entities/vehicule.entity';
import { Agent } from '../../entities/agent.entity';
import { MoyenTrans } from '../../entities/moyen-trans.entity';
import { CreateVehiculeDto } from './dto/create-vehicule.dto';
import { UpdateVehiculeDto } from './dto/update-vehicule.dto';
import { FilterVehiculeDto } from './dto/filter-vehicule.dto';

interface RequestingUser {
  id: number;
  role: string;
}

@Injectable()
export class VehiculeService {
  constructor(
    @InjectRepository(Vehicule) private vehiculeRepository: Repository<Vehicule>,
    @InjectRepository(Agent) private agentRepository: Repository<Agent>,
    @InjectRepository(MoyenTrans) private moyenTransRepository: Repository<MoyenTrans>,
  ) {}

  /** Résout la société de l'appelant ; lève une erreur si non rattaché à une société */
  private async resolveSocieteId(requestingUser: RequestingUser, requestedSocieteId?: number): Promise<number> {
    if (requestingUser.role === 'ADMIN') {
      if (!requestedSocieteId) {
        throw new BadRequestException('societeId est requis pour un Administrateur');
      }
      return requestedSocieteId;
    }

    const agent = await this.agentRepository.findOne({ where: { userId: requestingUser.id } });
    if (!agent?.societeId) {
      throw new ForbiddenException('Vous devez être rattaché à une société pour gérer sa flotte');
    }
    return agent.societeId;
  }

  async create(dto: CreateVehiculeDto, requestingUser: RequestingUser): Promise<Vehicule> {
    const societeId = await this.resolveSocieteId(requestingUser);

    const moyenTrans = await this.moyenTransRepository.findOne({ where: { id: dto.moyenTransId } });
    if (!moyenTrans) {
      throw new NotFoundException('Moyen de transport introuvable');
    }
    if (moyenTrans.societeId !== societeId) {
      throw new ForbiddenException('Ce moyen de transport n\'appartient pas à votre société');
    }

    const existing = await this.vehiculeRepository.findOne({ where: { immatriculation: dto.immatriculation } });
    if (existing) {
      throw new BadRequestException('Un véhicule avec cette immatriculation existe déjà');
    }

    const vehicule = this.vehiculeRepository.create({ ...dto, societeId });
    return this.vehiculeRepository.save(vehicule);
  }

  async findAll(filter: FilterVehiculeDto, requestingUser: RequestingUser) {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 10;
    const where: any = {};

    if (requestingUser.role !== 'ADMIN') {
      const agent = await this.agentRepository.findOne({ where: { userId: requestingUser.id } });
      if (!agent?.societeId) return { data: [], total: 0, page, limit };
      where.societeId = agent.societeId;
    }

    if (filter.immatriculation) where.immatriculation = filter.immatriculation;
    if (filter.statut) where.statut = filter.statut;
    if (filter.moyenTransId) where.moyenTransId = filter.moyenTransId;
    
    if (filter.isActif !== undefined) {
      where.isActif = filter.isActif;
    }

    const [data, total] = await this.vehiculeRepository.findAndCount({
      where,
      relations: { moyenTrans: true, societe: true },
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return { data, total, page, limit };
  }

  async findOne(id: number): Promise<Vehicule> {
    const vehicule = await this.vehiculeRepository.findOne({
      where: { id },
      relations: { moyenTrans: true, societe: true },
    });
    if (!vehicule) throw new NotFoundException(`Véhicule avec l'ID ${id} non trouvé`);
    return vehicule;
  }

  private async assertOwnership(id: number, requestingUser: RequestingUser): Promise<Vehicule> {
    const vehicule = await this.findOne(id);
    if (requestingUser.role === 'ADMIN') return vehicule;

    const agent = await this.agentRepository.findOne({ where: { userId: requestingUser.id } });
    if (!agent || agent.societeId !== vehicule.societeId) {
      throw new ForbiddenException('Ce véhicule n\'appartient pas à votre société');
    }
    return vehicule;
  }

  async update(id: number, dto: UpdateVehiculeDto, requestingUser: RequestingUser): Promise<Vehicule> {
    await this.assertOwnership(id, requestingUser);
    await this.vehiculeRepository.update(id, dto);
    return this.findOne(id);
  }

  async remove(id: number, requestingUser: RequestingUser): Promise<void> {
    await this.assertOwnership(id, requestingUser);
    await this.vehiculeRepository.delete(id);
  }
}