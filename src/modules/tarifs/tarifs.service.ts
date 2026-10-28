import { Injectable, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tarif } from '../../entities/tarif.entity';
import { Agent } from '../../entities/agent.entity';
import { Route } from '../../entities/route.entity';
import { CreateTarifDto } from './dto/create-tarifs.dto';
import { UpdateTarifDto } from './dto/update-tarifs.dto';
import { FilterTarifDto } from './dto/filter-tarifs.dto';

interface RequestingUser {
  id: number;
  role: string;
}

@Injectable()
export class TarifsService {
  constructor(
    @InjectRepository(Tarif) 
    private tarifRepository: Repository<Tarif>,

    @InjectRepository(Agent) 
    private agentRepository: Repository<Agent>,

    @InjectRepository(Route) 
    private routeRepository: Repository<Route>,
  ) {}

  private async resolveSocieteId(requestingUser: RequestingUser): Promise<number | null> {
    if (requestingUser.role === 'ADMIN') return null; // L'admin n'est pas rattaché à une société spécifique
    
    const agent = await this.agentRepository.findOne({ 
        where: { userId: requestingUser.id } 
    });
    if (!agent?.societeId) {
      throw new ForbiddenException('Vous devez être rattaché à une société pour gérer ses tarifs');
    }
    return agent.societeId;
  }

  async create(
    dto: CreateTarifDto, 
    requestingUser: RequestingUser
  ): Promise<Tarif> {
    const societeId = await this.resolveSocieteId(requestingUser);

    const route = await this.routeRepository.findOne({
      where: { id: dto.routeId },
      relations: { moyenTrans: true },
    });
    if (!route) throw new NotFoundException('Route introuvable');
    
    // Si c'est un agent, on vérifie que la route lui appartient
    if (societeId && route.moyenTrans.societeId !== societeId) {
      throw new ForbiddenException('Cette route n\'appartient pas à votre société');
    }

    // Si c'est l'admin, on prend la société de la route
    const effectiveSocieteId = societeId ?? route.moyenTrans.societeId;

    if (dto.prixPromo !== undefined && dto.prixPromo >= dto.prix) {
      throw new BadRequestException('Le prix promotionnel doit être inférieur au prix normal');
    }

    const tarif = this.tarifRepository.create({ ...dto, societeId: effectiveSocieteId });
    return this.tarifRepository.save(tarif);
  }

  async findAll(
    filter: FilterTarifDto, 
    requestingUser: RequestingUser
  ) {
  const page = filter.page ?? 1;
  const limit = filter.limit ?? 10;
  const where: any = {};

  if (requestingUser.role !== 'ADMIN' && requestingUser.role !== 'PUBLIC') {
    const agent = await this.agentRepository.findOne({ 
        where: { userId: requestingUser.id } 
    });
    if (!agent?.societeId) return { data: [], total: 0, page, limit };
    where.societeId = agent.societeId;
  } else if (requestingUser.role === 'ADMIN' && filter.societeId) {
    where.societeId = filter.societeId;
  }

    if (filter.categorie) where.categorie = filter.categorie;
    if (filter.type) where.type = filter.type;
    if (filter.routeId) where.routeId = filter.routeId;
    if (filter.isActif !== undefined) where.isActif = filter.isActif;

    const [data, total] = await this.tarifRepository.findAndCount({
      where,
      relations: { route: true, societe: true },
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return { data, total, page, limit };
  }

  async findOne(id: number): Promise<Tarif> {
    const tarif = await this.tarifRepository.findOne({
      where: { id },
      relations: { route: true, societe: true },
    });
    if (!tarif) throw new NotFoundException(`Tarif avec l'ID ${id} non trouvé`);
    return tarif;
  }

  private async assertOwnership(
    id: number, 
    requestingUser: RequestingUser
    ): Promise<Tarif> {
    const tarif = await this.findOne(id);
    if (requestingUser.role === 'ADMIN') 
        return tarif;

    const agent = await this.agentRepository.findOne({ 
        where: { userId: requestingUser.id } 
    });
    if (!agent || agent.societeId !== tarif.societeId) {
      throw new ForbiddenException('Ce tarif n\'appartient pas à votre société');
    }
    return tarif;
  }

  async update(
    id: number, 
    dto: UpdateTarifDto, 
    requestingUser: RequestingUser
  ): Promise<Tarif> {
    await this.assertOwnership(id, requestingUser);
    await this.tarifRepository.update(id, dto);
    return this.findOne(id);
  }

  async remove(
    id: number, 
    requestingUser: RequestingUser
  ): Promise<void> {
    await this.assertOwnership(id, requestingUser);
    await this.tarifRepository.delete(id);
  }
}