import { Injectable, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MoyenTrans } from '../../entities/moyen-trans.entity';
import { Agent } from '../../entities/agent.entity';
import { CreateMoyenTransDto } from './dto/create-moyen-trans.dto';
import { UpdateMoyenTransDto } from './dto/update-moyen-trans.dto';
import { FilterMoyenTransDto } from './dto/filter-moyens-trans.dto';

interface RequestingUser {
  id: number;
  role: string;
}

@Injectable()
export class MoyensTransService {
  constructor(
    @InjectRepository(MoyenTrans) private moyenTransRepository: Repository<MoyenTrans>,
    @InjectRepository(Agent) private agentRepository: Repository<Agent>,
  ) {}

  private async resolveSocieteId(requestingUser: RequestingUser): Promise<number> {
    if (requestingUser.role === 'ADMIN') {
      throw new BadRequestException('Un Administrateur ne crée pas de moyen de transport pour une société — réservé aux Agents/Directeurs');
    }
    const agent = await this.agentRepository.findOne({ where: { userId: requestingUser.id } });
    if (!agent?.societeId) {
      throw new ForbiddenException('Vous devez être rattaché à une société pour gérer ses moyens de transport');
    }
    return agent.societeId;
  }

  async create(dto: CreateMoyenTransDto, requestingUser: RequestingUser): Promise<MoyenTrans> {
    const societeId = await this.resolveSocieteId(requestingUser);
    const moyenTrans = this.moyenTransRepository.create({ ...dto, societeId });
    return this.moyenTransRepository.save(moyenTrans);
  }

  async findAll(filter: FilterMoyenTransDto, requestingUser: RequestingUser) {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 10;
    const where: any = {};

    if (requestingUser.role !== 'ADMIN') {
      const agent = await this.agentRepository.findOne({ where: { userId: requestingUser.id } });
      if (!agent?.societeId) return { data: [], total: 0, page, limit };
      where.societeId = agent.societeId;
    } else if (filter.societeId) {
      where.societeId = filter.societeId;
    }

    if (filter.type) where.type = filter.type;

    if (filter.isActif !== undefined) {
      where.isActif = filter.isActif;
    }

    const [data, total] = await this.moyenTransRepository.findAndCount({
      where,
      relations: { societe: true },
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return { data, total, page, limit };
  }

  async findOne(id: number): Promise<MoyenTrans> {
    const moyenTrans = await this.moyenTransRepository.findOne({
      where: { id },
      relations: { societe: true, vehicules: true, routes: true },
    });
    if (!moyenTrans) throw new NotFoundException(`Moyen de transport avec l'ID ${id} non trouvé`);
    return moyenTrans;
  }

  private async assertOwnership(id: number, requestingUser: RequestingUser): Promise<MoyenTrans> {
    const moyenTrans = await this.findOne(id);
    if (requestingUser.role === 'ADMIN') return moyenTrans;

    const agent = await this.agentRepository.findOne({ where: { userId: requestingUser.id } });
    if (!agent || agent.societeId !== moyenTrans.societeId) {
      throw new ForbiddenException('Ce moyen de transport n\'appartient pas à votre société');
    }
    return moyenTrans;
  }

  async update(id: number, dto: UpdateMoyenTransDto, requestingUser: RequestingUser): Promise<MoyenTrans> {
    await this.assertOwnership(id, requestingUser);
    await this.moyenTransRepository.update(id, dto);
    return this.findOne(id);
  }

  async remove(id: number, requestingUser: RequestingUser): Promise<void> {
    const moyenTrans = await this.assertOwnership(id, requestingUser);
    if (moyenTrans.vehicules?.length > 0 || moyenTrans.routes?.length > 0) {
      throw new BadRequestException('Impossible de supprimer un moyen de transport ayant des véhicules ou des routes associés');
    }
    await this.moyenTransRepository.delete(id);
  }
}