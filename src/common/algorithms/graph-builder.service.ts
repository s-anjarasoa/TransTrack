import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Route, RouteStatut } from '../../entities/route.entity';
import { Tarif } from '../../entities/tarif.entity';
import { Location } from '../../entities/location.entity';
import { Graph, GraphEdge, GraphNode } from '../utils/graph.types'; 

@Injectable()
export class GraphBuilderService {
  private readonly logger = new Logger(GraphBuilderService.name);
  private cachedGraph: Graph | null = null;
  private cacheBuiltAt = 0;
  private readonly CACHE_TTL_MS = 60_000;

  constructor(
    @InjectRepository(Route) private routeRepo: Repository<Route>,
    @InjectRepository(Tarif) private tarifRepo: Repository<Tarif>,
  ) {}

  async getGraph(societeId?: number, forceReload = false): Promise<Graph> {
    const now = Date.now();
    const cacheKey = societeId ?? 'all';
    if (
      !forceReload &&
      this.cachedGraph &&
      (this.cachedGraph as any)._cacheKey === cacheKey &&
      now - this.cacheBuiltAt < this.CACHE_TTL_MS
    ) {
      return this.cachedGraph;
    }

    const graph = await this.build(societeId);
    (graph as any)._cacheKey = cacheKey;
    this.cachedGraph = graph;
    this.cacheBuiltAt = now;
    return graph;
  }

  invalidateCache(): void {
    this.cachedGraph = null;
    this.cacheBuiltAt = 0;
  }

  private async build(societeId?: number): Promise<Graph> {
    const t0 = Date.now();

    const where: any = { statut: RouteStatut.ACTIVE };
    if (societeId) where.societeId = societeId;

    const routes = await this.routeRepo.find({
      where,
      relations: { stops: { location: true }, moyenTrans: true },
      order: { stops: { ordre: 'ASC' } },
    });

    const tarifs = await this.tarifRepo.find({
      where: { isActif: true },
      order: { createdAt: 'DESC' },
    });

    const bestTarifByRoute = new Map<number, Tarif>();
    for (const t of tarifs) {
      if (!bestTarifByRoute.has(t.routeId)) bestTarifByRoute.set(t.routeId, t);
    }

    const nodes = new Map<number, GraphNode>();
    const adjacency = new Map<number, GraphEdge[]>();

    let maxSpeedObserved = 0;
    let minPricePerKm = Infinity;
    let skippedNoStops = 0;
    let skippedNoGps = 0;
    let skippedNoTarif = 0;

    for (const route of routes) {
      const stops = route.stops ?? [];
      if (stops.length < 2) { skippedNoStops++; continue; }

      const first = stops[0];
      const last = stops[stops.length - 1];
      const startLoc = first.location;
      const endLoc = last.location;

      if (
        !startLoc?.latitude || !startLoc?.longitude ||
        !endLoc?.latitude || !endLoc?.longitude
      ) { skippedNoGps++; continue; }

      const tarif = bestTarifByRoute.get(route.id);
      if (!tarif) { skippedNoTarif++; continue; }

      const distance = this.toNumber(route.distance)
        ?? this.toNumber(last.distanceDepuisDepart)
        ?? this.haversineKm(
            +startLoc.latitude, +startLoc.longitude,
            +endLoc.latitude, +endLoc.longitude,
          );

      const duration = this.toNumber(route.dureeEstimee)
        ?? this.durationFromStops(first, last)
        ?? (distance / 60) * 60;

      const cost = this.toNumber(tarif.prixPromo)
        ?? this.toNumber(tarif.prix)
        ?? Infinity;

      if (duration > 0) {
        maxSpeedObserved = Math.max(maxSpeedObserved, distance / duration);
      }
      if (distance > 0 && isFinite(cost)) {
        minPricePerKm = Math.min(minPricePerKm, cost / distance);
      }

      const startNode = this.mkNode(startLoc);
      const endNode = this.mkNode(endLoc);
      nodes.set(startNode.locationId, startNode);
      nodes.set(endNode.locationId, endNode);

      const edge: GraphEdge = {
        fromNodeId: startNode.locationId,
        toNodeId: endNode.locationId,
        routeId: route.id,
        routeName: route.nom ?? `${route.depart} → ${route.arrivee}`,
        distance: Math.round(distance * 100) / 100,
        duration: Math.round(duration * 100) / 100,
        cost,
        moyenTransType: route.moyenTrans?.type ?? 'UNKNOWN',
      };

      if (!adjacency.has(edge.fromNodeId)) adjacency.set(edge.fromNodeId, []);
      adjacency.get(edge.fromNodeId)!.push(edge);
    }

    this.logger.log(
      `📊 Graphe${societeId ? ` [societe=${societeId}]` : ''} en ${Date.now() - t0}ms : ` +
      `${routes.length} routes → ${nodes.size} nœuds. ` +
      `Ignorées : ${skippedNoStops} (stops), ${skippedNoGps} (GPS), ${skippedNoTarif} (tarif)`,
    );

    return {
      nodes,
      adjacency,
      maxSpeedKmPerMin: maxSpeedObserved || 1,
      minPricePerKm: isFinite(minPricePerKm) ? minPricePerKm : 100,
    };
  }

  private mkNode(loc: Location): GraphNode {
    return {
      locationId: loc.id,
      name: loc.name,
      latitude: +loc.latitude!,
      longitude: +loc.longitude!,
    };
  }

  private toNumber(v: any): number | null {
    if (v == null) return null;
    const n = typeof v === 'string' ? parseFloat(v) : Number(v);
    return isNaN(n) ? null : n;
  }

  private durationFromStops(first: any, last: any): number | null {
    const dep = this.toNumber(first.heureDepartRel);
    const arr = this.toNumber(last.heureArriveeRel);
    if (dep != null && arr != null && arr > dep) return arr - dep;
    return null;
  }

  private haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
}