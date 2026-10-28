import {
  Injectable, NotFoundException, ConflictException,
  BadRequestException, Logger, OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import axios from 'axios';

import { Location, LocationType } from '../../entities/location.entity';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { FilterLocationDto } from './dto/filter-location.dto';
import { MADAGASCAR_CITIES } from './data/madagascar-cities';
import { MADAGASCAR_PROVINCES } from './data/madagascar-provinces';

@Injectable()
export class LocationsService implements OnModuleInit {
  private readonly logger = new Logger(LocationsService.name);

  constructor(
    @InjectRepository(Location)
    private locationRepo: Repository<Location>,
  ) {}

  // ══════════════════════════════════════════════════════════
  // SEED AU DÉMARRAGE
  // ══════════════════════════════════════════════════════════
  async onModuleInit() {
    const count = await this.locationRepo.count();
    if (count === 0) {
      this.logger.log(`🌍 Seed de ${MADAGASCAR_CITIES.length} villes...`);
      for (const city of MADAGASCAR_CITIES) {
        await this.locationRepo.save(this.locationRepo.create(city));
      }
      this.logger.log('✅ Seed terminé');
    }
  }

  // ══════════════════════════════════════════════════════════
  // CRUD
  // ══════════════════════════════════════════════════════════
  async create(dto: CreateLocationDto): Promise<Location> {
    const existing = await this.locationRepo.findOne({
      where: {
        name: dto.name,
        ...(dto.province ? { province: dto.province } : {}),
      },
    });
    if (existing) {
      throw new ConflictException(
        `Un lieu nommé "${dto.name}" existe déjà${dto.province ? ` dans ${dto.province}` : ''}`,
      );
    }

    const location = this.locationRepo.create(dto);
    return this.locationRepo.save(location);
  }

  async findAll(filter: FilterLocationDto) {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 100;

    const qb = this.locationRepo.createQueryBuilder('l');

    if (filter.search) {
      qb.andWhere(
        '(l.name ILIKE :s OR l.province ILIKE :s OR l.address ILIKE :s)',
        { s: `%${filter.search}%` },
      );
    }
    if (filter.type) {
      qb.andWhere('l.type = :t', { t: filter.type });
    }
    if (filter.province) {
      qb.andWhere('l.province = :p', { p: filter.province });
    }
    if (filter.isActive === 'true') {
      qb.andWhere('l.isActive = true');
    } else if (filter.isActive === 'false') {
      qb.andWhere('l.isActive = false');
    }

    qb.orderBy('l.province', 'ASC')
      .addOrderBy('l.name', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit };
  }

  // ══════════════════════════════════════════════════════════
  // ✅ AUTOCOMPLÉTION (retourne max `limit` résultats légers)
  // ══════════════════════════════════════════════════════════
  async search(query: string, limit = 10): Promise<Location[]> {
    if (!query || query.trim().length < 2) return [];

    const q = `%${query.trim()}%`;

    return this.locationRepo
      .createQueryBuilder('l')
      .where(
        '(l.name ILIKE :q OR l.province ILIKE :q OR l.region ILIKE :q OR l.address ILIKE :q)',
        { q },
      )
      .orderBy('l.name', 'ASC')
      .limit(limit)
      .getMany();
  }

  async findOne(id: number): Promise<Location> {
    const location = await this.locationRepo.findOne({ where: { id } });
    if (!location) {
      throw new NotFoundException(`Lieu #${id} introuvable`);
    }
    return location;
  }

  async update(id: number, dto: UpdateLocationDto): Promise<Location> {
    const location = await this.findOne(id);
    Object.assign(location, dto);
    return this.locationRepo.save(location);
  }

  async remove(id: number): Promise<void> {
    const location = await this.findOne(id);
    const result = await this.locationRepo.delete(location.id);
    if (result.affected === 0) {
      throw new BadRequestException('Suppression impossible');
    }
  }

  // ══════════════════════════════════════════════════════════
  // ✅ PROVINCES
  // ══════════════════════════════════════════════════════════

  /** Récupère la liste des provinces distinctes présentes en BDD */
  async getProvinces(): Promise<string[]> {
    const rows = await this.locationRepo
      .createQueryBuilder('l')
      .select('DISTINCT l.province', 'province')
      .where('l.province IS NOT NULL')
      .orderBy('l.province', 'ASC')
      .getRawMany();
    return rows.map((r) => r.province);
  }

  /** Infos statiques d'une province (centre, zoom, régions) */
  getProvinceInfo(name: string) {
    const info = MADAGASCAR_PROVINCES[name];
    if (!info) {
      throw new NotFoundException(`Province "${name}" inconnue`);
    }
    return { name, ...info };
  }

  // ══════════════════════════════════════════════════════════
  // ✅ GEOCODAGE (Nominatim / OpenStreetMap)
  // ══════════════════════════════════════════════════════════
  async geocode(query: string): Promise<{
    lat: number;
    lng: number;
    displayName: string;
  } | null> {
    if (!query || query.length < 3) return null;

    try {
      const res = await axios.get('https://nominatim.openstreetmap.org/search', {
        params: {
          q: query,
          format: 'json',
          limit: 1,
          countrycodes: 'mg',
        },
        headers: {
          'User-Agent': 'TransTrack-M2/1.0 (etudiant@univ.mg)',
          Accept: 'application/json',
        },
        timeout: 5000,
      });

      const hit = res.data?.[0];
      if (!hit) return null;

      return {
        lat: +hit.lat,
        lng: +hit.lon,
        displayName: hit.display_name,
      };
    } catch (err: any) {
      this.logger.warn(`Geocode failed: ${err?.message}`);
      return null;
    }
  }

  // ══════════════════════════════════════════════════════════
  // ✅ REVERSE GEOCODING (coordonnées → adresse)
  // ══════════════════════════════════════════════════════════
  async reverseGeocode(lat: number, lng: number): Promise<{
    displayName: string;
    road?: string;
    suburb?: string;
    city?: string;
    county?: string;
    state?: string;
    country?: string;
  } | null> {
    if (!lat || !lng) return null;

    try {
      const res = await axios.get(
        'https://nominatim.openstreetmap.org/reverse',
        {
          params: {
            lat,
            lon: lng,
            format: 'json',
            addressdetails: 1,
            'accept-language': 'fr',
          },
          headers: {
            'User-Agent': 'TransTrack-M2/1.0 (etudiant@univ.mg)',
            Accept: 'application/json',
          },
          timeout: 5000,
        },
      );

      if (!res.data) return null;
      const a = res.data.address ?? {};

      return {
        displayName: res.data.display_name ?? '',
        road: a.road ?? a.pedestrian ?? a.footway,
        suburb: a.suburb ?? a.neighbourhood ?? a.quarter,
        city: a.city ?? a.town ?? a.village ?? a.municipality,
        county: a.county ?? a.district,
        state: a.state,
        country: a.country,
      };
    } catch (err: any) {
      this.logger.warn(`Reverse geocode failed: ${err?.message}`);
      return null;
    }
  }
}