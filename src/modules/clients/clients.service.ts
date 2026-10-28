import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, ILike } from 'typeorm';
import { Client } from '../../entities/client.entity';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { FilterClientsDto } from './dto/filter-client.dto';

@Injectable()
export class ClientsService {
  constructor(
    @InjectRepository(Client)
    private clientRepository: Repository<Client>,
  ) {}

  async create(dto: CreateClientDto, userId: number): Promise<Client> {
    const existing = await this.clientRepository.findOne({ where: { userId } });
    if (existing) {
      throw new ConflictException('Un profil client existe déjà pour cet utilisateur');
    }

    const client = this.clientRepository.create({ ...dto, userId });
    return this.clientRepository.save(client);
  }

  async findAll(filter: FilterClientsDto): Promise<{ data: Client[]; total: number; page: number; limit: number }> {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 10;

    const where: any = {};
    if (filter.address) where.address = ILike(`%${filter.address}%`);
    if (filter.CIN) where.CIN = filter.CIN;
    if (filter.passport) where.passport = filter.passport;
    if (filter.userId) where.userId = filter.userId;
    if (filter.fromDate && filter.toDate) {
      where.createdAt = Between(new Date(filter.fromDate), new Date(filter.toDate));
    }

    const [data, total] = await this.clientRepository.findAndCount({
      where,
      relations: { user: true },
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return { data, total, page, limit };
  }

  async findOne(id: number): Promise<Client> {
    const client = await this.clientRepository.findOne({
      where: { id },
      relations: { user: true },
    });
    if (!client) {
      throw new NotFoundException(`Client avec l'ID ${id} non trouvé`);
    }
    return client;
  }

  async findByUserId(userId: number): Promise<Client> {
    const client = await this.clientRepository.findOne({
      where: { userId },
      relations: { user: true },
    });
    if (!client) {
      throw new NotFoundException('Profil client non trouvé pour cet utilisateur');
    }
    return client;
  }

  async update(id: number, dto: UpdateClientDto): Promise<Client> {
    await this.clientRepository.update(id, dto);
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    const result = await this.clientRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Client avec l'ID ${id} non trouvé`);
    }
  }
}