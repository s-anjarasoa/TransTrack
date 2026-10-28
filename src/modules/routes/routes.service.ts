import {
  Injectable, ForbiddenException, NotFoundException,
  BadRequestException, Logger,
} from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, In, DataSource } from 'typeorm';

import { Route, RouteStatut } from '../../entities/route.entity';
import { RouteStop, RouteStopType } from '../../entities/route-stop.entity';
import { Agent } from '../../entities/agent.entity';
import { MoyenTrans } from '../../entities/moyen-trans.entity';
import { Location } from '../../entities/location.entity';
import { CreateRouteDto } from './dto/create-routes.dto';
import { UpdateRouteDto } from './dto/update-routes.dto';
import { FilterRouteDto } from './dto/filter-routes.dto';

interface RequestingUser {
  id: number;
  role: string;
}

@Injectable()
export class RoutesService {
  private readonly logger = new Logger(RoutesService.name);

  constructor(
    @InjectRepository(Route)
    private routeRepository: Repository<Route>,

    @InjectRepository(RouteStop)
    private stopRepository: Repository<RouteStop>,

    @InjectRepository(Agent)
    private agentRepository: Repository<Agent>,

    @InjectRepository(MoyenTrans)
    private moyenTransRepository: Repository<MoyenTrans>,

    @InjectRepository(Location)
    private locationRepository: Repository<Location>,

    @InjectDataSource()
    private dataSource: DataSource,
  ) {}

  // ══════════════════════════════════════════════════════════
  // HELPERS
  // ══════════════════════════════════════════════════════════

  private async getRequestingAgentSocieteId(
    requestingUser: RequestingUser,
  ): Promise<number | null> {
    if (requestingUser.role === 'ADMIN' || requestingUser.role === 'PUBLIC') {
      return null;
    }
    const agent = await this.agentRepository.findOne({
      where: { userId: requestingUser.id },
    });
    return agent?.societeId ?? null;
  }

  /**
   * ✅ Haversine : distance en km entre 2 points GPS
   */
  private haversineKm(
    lat1: number, lon1: number,
    lat2: number, lon2: number,
  ): number {
    const R = 6371;
    const toRad = (d: number) => (d * Math.PI) / 180;

    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;

    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  /**
   * ✅ Prépare les stops : valide, trie, calcule distances cumulées
   */
  private async prepareStops(
    stopsDto: { locationId: number; ordre: number; [key: string]: any }[],
  ) {
    if (stopsDto.length < 2) {
      throw new BadRequestException('Minimum 2 stops (départ + arrivée)');
    }

    const locationIds = stopsDto.map((s) => s.locationId);
    const locations = await this.locationRepository.find({
      where: { id: In(locationIds) },
    });

    if (locations.length !== new Set(locationIds).size) {
      throw new BadRequestException('Une ou plusieurs localisations introuvables');
    }

    const locMap = new Map(locations.map((l) => [l.id, l]));
    for (const id of locationIds) {
      const loc = locMap.get(id)!;
      if (!loc.latitude || !loc.longitude) {
        throw new BadRequestException(
          `Le lieu "${loc.name}" n'a pas de coordonnées GPS`,
        );
      }
    }

    const sorted = [...stopsDto].sort((a, b) => a.ordre - b.ordre);

    let cumul = 0;
    const prepared: any[] = [];

    for (let i = 0; i < sorted.length; i++) {
      const stop = sorted[i];
      const loc = locMap.get(stop.locationId)!;

      if (i > 0) {
        const prevLoc = locMap.get(sorted[i - 1].locationId)!;
        cumul += this.haversineKm(
          +prevLoc.latitude!, +prevLoc.longitude!,
          +loc.latitude!, +loc.longitude!,
        );
      }

      prepared.push({
        ...stop,
        distanceCumul: Math.round(cumul * 100) / 100,
      });
    }

    const firstLoc = locMap.get(sorted[0].locationId)!;
    const lastLoc = locMap.get(sorted[sorted.length - 1].locationId)!;

    return {
      totalKm: Math.round(cumul * 100) / 100,
      stops: prepared,
      firstLoc,
      lastLoc,
    };
  }

  /**
   * ✅ Crée les RouteStop entities à partir des stops préparés
   */
  private buildStopEntities(
    routeId: number,
    stopsData: any[],
  ): Partial<RouteStop>[] {
    return stopsData.map((s, idx) => {
      const isFirst = idx === 0;
      const isLast = idx === stopsData.length - 1;

      return {
        routeId,
        locationId: s.locationId,
        ordre: s.ordre,
        type: isFirst
          ? RouteStopType.DEPART
          : isLast
          ? RouteStopType.ARRIVEE
          : RouteStopType.INTERMEDIAIRE,
        heureDepartRel: s.heureDepartRel,
        heureArriveeRel: s.heureArriveeRel,
        distanceDepuisDepart: s.distanceCumul,
        description: s.description,
      };
    });
  }

  // ══════════════════════════════════════════════════════════
  // CRÉATION
  // ══════════════════════════════════════════════════════════
  async create(
    dto: CreateRouteDto,
    requestingUser: RequestingUser,
  ): Promise<Route> {
    const societeId = await this.getRequestingAgentSocieteId(requestingUser);

    if (requestingUser.role !== 'ADMIN' && !societeId) {
      throw new ForbiddenException(
        'Vous devez être rattaché à une société pour créer une route',
      );
    }

    // Vérifier le moyen de transport
    const moyenTrans = await this.moyenTransRepository.findOne({
      where: { id: dto.moyenTransId },
    });
    if (!moyenTrans) {
      throw new NotFoundException(`Moyen de transport #${dto.moyenTransId} introuvable`);
    }
    if (societeId && moyenTrans.societeId !== societeId) {
      throw new ForbiddenException(
        "Ce moyen de transport n'appartient pas à votre société",
      );
    }

    const effectiveSocieteId = societeId ?? moyenTrans.societeId;

    // ═══════════════════════════════════════════════════════
    // CAS 1 : Avec stops (nouveau)
    // ═══════════════════════════════════════════════════════
    if (dto.stops && dto.stops.length >= 2) {
      const { totalKm, stops, firstLoc, lastLoc } =
        await this.prepareStops(dto.stops);

      // ✅ On stocke l'ID renvoyé par la transaction
      const newRouteId = await this.dataSource.transaction(async (manager) => {
        const route = manager.create(Route, {
          nom: dto.nom,
          depart: firstLoc.name,
          arrivee: lastLoc.name,
          distance: totalKm,
          dureeEstimee: dto.dureeEstimee,
          statut: dto.statut ?? RouteStatut.ACTIVE,
          description: dto.description,
          moyenTransId: dto.moyenTransId,
          societeId: effectiveSocieteId,
        });
        const savedRoute = await manager.save(route);

        const stopEntities = this.buildStopEntities(savedRoute.id, stops);
        await manager.save(RouteStop, stopEntities);

        this.logger.log(
          `Route ${savedRoute.id} créée (${stops.length} stops, ${totalKm} km)`,
        );

        return savedRoute.id; // ✅ On retourne uniquement l'ID
      });

      // ✅ On fait le findOne une fois que la transaction est terminée (committed)
      return this.findOne(newRouteId);
    }

    // ═══════════════════════════════════════════════════════
    // CAS 2 : Fallback manuel (ancien mode)
    // ═══════════════════════════════════════════════════════
    if (!dto.depart || !dto.arrivee) {
      throw new BadRequestException(
        'Fournir soit "stops" (≥2) soit "depart" + "arrivee"',
      );
    }

    const route = this.routeRepository.create({
      nom: dto.nom,
      depart: dto.depart,
      arrivee: dto.arrivee,
      pointDepart: dto.pointDepart,
      pointArrivee: dto.pointArrivee,
      distance: dto.distance,
      dureeEstimee: dto.dureeEstimee,
      statut: dto.statut ?? RouteStatut.ACTIVE,
      description: dto.description,
      moyenTransId: dto.moyenTransId,
      societeId: effectiveSocieteId,
    });

    return this.routeRepository.save(route);
  }

  // ══════════════════════════════════════════════════════════
  // LECTURE
  // ══════════════════════════════════════════════════════════
   async findAll(filter: FilterRouteDto, requestingUser: RequestingUser) {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 10;

    const qb = this.routeRepository
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.moyenTrans', 'moyenTrans')
      .leftJoinAndSelect('r.societe', 'societe')
      .leftJoinAndSelect('r.stops', 'stops')
      .leftJoinAndSelect('stops.location', 'stopLocation');

    // ─── Filtrage par rôle ───
    if (requestingUser.role === 'PUBLIC') {
      qb.andWhere('r.statut = :st', { st: RouteStatut.ACTIVE });
    } else if (requestingUser.role !== 'ADMIN') {
      const societeId = await this.getRequestingAgentSocieteId(requestingUser);
      if (!societeId) {
        return { data: [], total: 0, page, limit };
      }
      qb.andWhere('r.societeId = :sid', { sid: societeId });
    } else if (filter.societeId) {
      qb.andWhere('r.societeId = :sid', { sid: filter.societeId });
    }

    // ─── Filtres optionnels ───
    if (filter.search) {
      qb.andWhere(
        '(r.nom ILIKE :s OR r.depart ILIKE :s OR r.arrivee ILIKE :s)',
        { s: `%${filter.search}%` },
      );
    }
    if (filter.depart) qb.andWhere('r.depart ILIKE :d', { d: `%${filter.depart}%` });
    if (filter.arrivee) qb.andWhere('r.arrivee ILIKE :a', { a: `%${filter.arrivee}%` });
    if (filter.statut) qb.andWhere('r.statut = :stt', { stt: filter.statut });
    if (filter.moyenTransId) qb.andWhere('r.moyenTransId = :mt', { mt: filter.moyenTransId });

    qb.orderBy('r.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit };
  }

  async findOne(id: number): Promise<Route> {
    const route = await this.routeRepository.findOne({
      where: { id },
      relations: {
        moyenTrans: { societe: true },
        societe: true,
        tarifs: true,
        stops: { location: true },
        voyages: true,
      },
      order: { stops: { ordre: 'ASC' } },
    });

    if (!route) {
      throw new NotFoundException(`Route avec l'ID ${id} non trouvée`);
    }
    return route;
  }

  private async assertOwnership(
    id: number,
    requestingUser: RequestingUser,
  ): Promise<Route> {
    const route = await this.findOne(id);

    if (requestingUser.role === 'ADMIN') return route;

    const societeId = await this.getRequestingAgentSocieteId(requestingUser);
    if (!societeId || route.societeId !== societeId) {
      throw new ForbiddenException(
        "Cette route n'appartient pas à votre société",
      );
    }
    return route;
  }

  // ══════════════════════════════════════════════════════════
  // MISE À JOUR
  // ══════════════════════════════════════════════════════════
  async update(
    id: number,
    dto: UpdateRouteDto,
    requestingUser: RequestingUser,
  ): Promise<Route> {
    const existing = await this.assertOwnership(id, requestingUser);

    // ═══════════════════════════════════════════════════════
    // CAS 1 : Mise à jour avec nouveaux stops
    // ═══════════════════════════════════════════════════════
    if (dto.stops && dto.stops.length >= 2) {
      const { totalKm, stops, firstLoc, lastLoc } =
        await this.prepareStops(dto.stops);

      // ✅ On attend la fin de la transaction sans retourner le findOne à l'intérieur
      await this.dataSource.transaction(async (manager) => {
        // Supprimer anciens stops
        await manager.delete(RouteStop, { routeId: id });

        // Mettre à jour la route
        await manager.update(Route, id, {
          nom: dto.nom ?? existing.nom,
          depart: firstLoc.name,
          arrivee: lastLoc.name,
          distance: totalKm,
          dureeEstimee: dto.dureeEstimee ?? existing.dureeEstimee,
          statut: dto.statut ?? existing.statut,
          description: dto.description ?? existing.description,
        });

        // Recréer les stops
        const stopEntities = this.buildStopEntities(id, stops);
        await manager.save(RouteStop, stopEntities);
      });

      // ✅ On fait le findOne une fois la transaction terminée
      return this.findOne(id);
    }

    // ═══════════════════════════════════════════════════════
    // CAS 2 : Mise à jour simple (sans stops)
    // ═══════════════════════════════════════════════════════
    const { stops, ...updateData } = dto;   // retirer 'stops' du payload
    await this.routeRepository.update(id, updateData as any);
    return this.findOne(id);
  }

  // ══════════════════════════════════════════════════════════
  // SUPPRESSION
  // ══════════════════════════════════════════════════════════
  async remove(id: number, requestingUser: RequestingUser): Promise<void> {
    const route = await this.assertOwnership(id, requestingUser);

    // ✅ FIX : vérification des voyages (relations chargées dans findOne)
    if (route.voyages?.length > 0) {
      throw new BadRequestException(
        `Impossible de supprimer : ${route.voyages.length} voyage(s) associé(s)`,
      );
    }
   
    await this.dataSource.transaction(async (manager) => {
      await manager.delete(RouteStop, { routeId: id });
      await manager.delete(Route, id);
    });

    this.logger.log(`Route ${id} supprimée`);
  }
}