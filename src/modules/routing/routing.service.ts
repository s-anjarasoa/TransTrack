import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import {
  RoutingAlgorithm, RoutingCriteria, RoutingLog,
} from 'src/entities/routing.entity';
import { FindPathDto } from './dto/find-path.dto';
import {
  PathResultDto, PathStepDto, PreviewPathDto, PreviewResultDto,
} from './dto/path-result.dto';
import { GraphBuilderService } from 'src/common/algorithms/graph-builder.service';
import { astar } from 'src/common/algorithms/astar.algorithm';
import { dijkstra } from 'src/common/algorithms/dijkstra.algorithm';
import { GraphEdge } from 'src/common/utils/graph.types';
import { Route } from 'src/entities/route.entity';

interface RequestingUser {
  id: number;
  role: string;
  societeId?: number;
}

export interface Waypoint {
  name: string;
  latitude: number;
  longitude: number;
}

@Injectable()
export class RoutingService {
  private readonly logger = new Logger(RoutingService.name);

  constructor(
    private readonly graphBuilder: GraphBuilderService,
    @InjectRepository(RoutingLog)
    private readonly logRepo: Repository<RoutingLog>,
    @InjectRepository(Route)
    private readonly routeRepo: Repository<Route>,
  ) {}

  private resolveSocieteScope(
    user: RequestingUser,
    requestedSocieteId?: number,
  ): number | undefined {
    if (user.role === 'ADMIN') return requestedSocieteId;
    if (user.role === 'AGENT') return user.societeId;
    return undefined;
  }

  // ✅ MÉTHODE UTILITAIRE : Récupère les waypoints pour un chemin donné
  private async fetchWaypoints(path: GraphEdge[]): Promise<Waypoint[]> {
    if (!path || path.length === 0) return [];

    const routeIds = path.map(e => e.routeId);
    const routes = await this.routeRepo.find({
      where: { id: In(routeIds) },
      relations: { stops: { location: true }, tarifs: true },
      order: { stops: { ordre: 'ASC' } },
    });
    const routeMap = new Map(routes.map(r => [r.id, r]));
    const waypoints: Waypoint[] = [];

    for (const edge of path) {
      const route = routeMap.get(edge.routeId);
      if (!route) continue;
      for (const stop of route.stops) {
        if (!stop.location || !stop.location.latitude || !stop.location.longitude) continue;
        const last = waypoints[waypoints.length - 1];
        if (last && last.name === stop.location.name) continue;
        
        waypoints.push({
          name: stop.location.name,
          latitude: Number(stop.location.latitude),
          longitude: Number(stop.location.longitude),
        });
      }
    }
    return waypoints;
  }

  // ═══════════════════════════════════════════════════════════
  // CALCUL D'ITINÉRAIRE
  // ═══════════════════════════════════════════════════════════
  async findPath(dto: FindPathDto, user: RequestingUser): Promise<PathResultDto> {
    const societeId = this.resolveSocieteScope(user, dto.societeId);
    const graph = await this.graphBuilder.getGraph(societeId);

    const start = graph.nodes.get(dto.startId);
    const end = graph.nodes.get(dto.endId);
    if (!start) throw new BadRequestException(`Location de départ #${dto.startId} introuvable`);
    if (!end) throw new BadRequestException(`Location d'arrivée #${dto.endId} introuvable`);

    const t0 = performance.now();
    const result = dto.algorithm === RoutingAlgorithm.DIJKSTRA
      ? dijkstra(graph, dto.startId, dto.endId, dto.criteria)
      : astar(graph, dto.startId, dto.endId, dto.criteria);
    const elapsed = performance.now() - t0;

    const pathSteps: PathStepDto[] = result.path.map((e) => {
      const fromNode = graph.nodes.get(e.fromNodeId);
      const toNode = graph.nodes.get(e.toNodeId);
      return {
        routeId: e.routeId, routeName: e.routeName,
        fromNodeId: e.fromNodeId, fromName: fromNode?.name ?? '',
        fromLat: fromNode?.latitude ?? 0, fromLng: fromNode?.longitude ?? 0,
        toNodeId: e.toNodeId, toName: toNode?.name ?? '',
        toLat: toNode?.latitude ?? 0, toLng: toNode?.longitude ?? 0,
        distance: e.distance, duration: e.duration, cost: e.cost,
        moyenTransType: e.moyenTransType,
      };
    });

    const waypoints = await this.fetchWaypoints(result.path);

    const response: PathResultDto = {
      found: result.found, algorithm: dto.algorithm, criteria: dto.criteria,
      path: pathSteps, waypoints, nodeIds: result.nodeIds,
      totalDistance: result.totalDistance, totalDuration: result.totalDuration,
      totalCost: result.totalCost, nodesExplored: result.nodesExplored,
      executionTimeMs: Math.round(elapsed * 1000) / 1000,
    };

    this.logRepo.save(this.logRepo.create({
      startLocationId: dto.startId, endLocationId: dto.endId,
      criteria: dto.criteria, algorithm: dto.algorithm,
      executionTimeMs: response.executionTimeMs, nodesExplored: result.nodesExplored,
      pathLength: result.path.length, totalDistance: result.totalDistance,
      totalDuration: result.totalDuration, totalCost: result.totalCost,
      found: result.found,
      pathJson: result.found ? { routeIds: result.path.map(e => e.routeId), nodeIds: result.nodeIds } : null,
    })).catch(err => this.logger.warn(`Log routing failed: ${err?.message}`));

    return response;
  }

  // ═══════════════════════════════════════════════════════════
  // PREVIEW
  // ═══════════════════════════════════════════════════════════
  async preview(
    startId: number, endId: number, user: RequestingUser, requestedSocieteId?: number,
  ): Promise<PreviewResultDto> {
    const societeId = this.resolveSocieteScope(user, requestedSocieteId);
    const graph = await this.graphBuilder.getGraph(societeId);

    const start = graph.nodes.get(startId);
    const end = graph.nodes.get(endId);

    const toPreviewLocation = (node: typeof start) => node ? {
      id: node.locationId, name: node.name, latitude: node.latitude, longitude: node.longitude,
    } : null;

    if (!start || !end || startId === endId) {
      return { startLocation: toPreviewLocation(start), endLocation: toPreviewLocation(end), paths: [] };
    }

    const rawPaths: { routeIds: number[]; type: string }[] = [];
    const startAdj = graph.adjacency.get(startId) ?? [];

    for (const edge of startAdj) {
      if (edge.toNodeId === endId) rawPaths.push({ routeIds: [edge.routeId], type: 'DIRECT' });
    }

    for (const edge1 of startAdj) {
      if (edge1.toNodeId === endId) continue;
      const midAdj = graph.adjacency.get(edge1.toNodeId) ?? [];
      for (const edge2 of midAdj) {
        if (edge2.toNodeId === endId) rawPaths.push({ routeIds: [edge1.routeId, edge2.routeId], type: '2-HOP' });
      }
    }

    const seen = new Set<string>();
    const uniqueRawPaths = rawPaths.filter((p) => {
      const key = p.routeIds.join('-');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    if (uniqueRawPaths.length === 0) {
      return { startLocation: toPreviewLocation(start), endLocation: toPreviewLocation(end), paths: [] };
    }

    const allRouteIds = uniqueRawPaths.flatMap(p => p.routeIds);
    const routes = await this.routeRepo.find({
      where: { id: In(allRouteIds) },
      relations: { stops: { location: true }, tarifs: true },
      order: { stops: { ordre: 'ASC' } },
    });
    const routeMap = new Map(routes.map(r => [r.id, r]));

    const paths: PreviewPathDto[] = uniqueRawPaths.map((p) => {
      const waypoints: Waypoint[] = [];
      let totalDistance = 0, totalDuration = 0, totalCost = 0;

      for (const routeId of p.routeIds) {
        const route = routeMap.get(routeId);
        if (!route) continue;
        for (const stop of route.stops) {
          if (!stop.location || !stop.location.latitude || !stop.location.longitude) continue;
          const last = waypoints[waypoints.length - 1];
          if (last && last.name === stop.location.name) continue;
          waypoints.push({
            name: stop.location.name,
            latitude: Number(stop.location.latitude),
            longitude: Number(stop.location.longitude),
          });
        }
        totalDistance += Number(route.distance) || 0;
        totalDuration += Number(route.dureeEstimee) || 0;
        const tarif = route.tarifs?.filter(t => t.isActif).sort((a,b) => b.id - a.id)[0];
        if (tarif) totalCost += Number(tarif.prixPromo || tarif.prix) || 0;
      }

      return {
        type: p.type as 'DIRECT' | '2-HOP',
        routeIds: p.routeIds,
        routeNames: p.routeIds.map(id => routeMap.get(id)?.nom ?? ''),
        waypoints,
        totalDistance: Math.round(totalDistance * 100) / 100,
        totalDuration: Math.round(totalDuration * 100) / 100,
        totalCost: Math.round(totalCost),
      };
    }).slice(0, 10);

    return { startLocation: toPreviewLocation(start), endLocation: toPreviewLocation(end), paths };
  }

  // ═══════════════════════════════════════════════════════════
  // COMPARE (Corrigé avec waypoints)
  // ═══════════════════════════════════════════════════════════
  async compare(startId: number, endId: number, criteria: RoutingCriteria) {
    const graph = await this.graphBuilder.getGraph();
    const tA0 = performance.now();
    const a = astar(graph, startId, endId, criteria);
    const aMs = performance.now() - tA0;

    const tD0 = performance.now();
    const d = dijkstra(graph, startId, endId, criteria);
    const dMs = performance.now() - tD0;

    const enrich = (path: GraphEdge[]) => path.map((e) => {
      const fromNode = graph.nodes.get(e.fromNodeId);
      const toNode = graph.nodes.get(e.toNodeId);
      return {
        routeId: e.routeId, routeName: e.routeName,
        fromNodeId: e.fromNodeId, fromName: fromNode?.name ?? '',
        fromLat: fromNode?.latitude ?? 0, fromLng: fromNode?.longitude ?? 0,
        toNodeId: e.toNodeId, toName: toNode?.name ?? '',
        toLat: toNode?.latitude ?? 0, toLng: toNode?.longitude ?? 0,
      };
    });

    // ✅ Récupération des waypoints pour A* et Dijkstra
    const aWaypoints = await this.fetchWaypoints(a.path);
    const dWaypoints = await this.fetchWaypoints(d.path);

    return {
      criteria,
      astar: { found: a.found, executionTimeMs: Math.round(aMs * 1000) / 1000, nodesExplored: a.nodesExplored, totalDistance: a.totalDistance, totalDuration: a.totalDuration, totalCost: a.totalCost, pathLength: a.path.length, path: enrich(a.path), waypoints: aWaypoints },
      dijkstra: { found: d.found, executionTimeMs: Math.round(dMs * 1000) / 1000, nodesExplored: d.nodesExplored, totalDistance: d.totalDistance, totalDuration: d.totalDuration, totalCost: d.totalCost, pathLength: d.path.length, path: enrich(d.path), waypoints: dWaypoints },
      gain: { nodesSaved: d.nodesExplored - a.nodesExplored, nodesSavedPercent: d.nodesExplored > 0 ? Math.round((1 - a.nodesExplored / d.nodesExplored) * 1000) / 10 : 0, timeSavedMs: Math.round((dMs - aMs) * 1000) / 1000, sameResult: a.totalCost === d.totalCost && a.totalDistance === d.totalDistance },
    };
  }

  async getStats() {
    const total = await this.logRepo.count();
    const byAlgo = await this.logRepo.createQueryBuilder('l').select('l.algorithm', 'algorithm').addSelect('COUNT(*)', 'count').addSelect('AVG(l.executionTimeMs)', 'avgTime').addSelect('AVG(l.nodesExplored)', 'avgNodes').groupBy('l.algorithm').getRawMany();
    return { total, byAlgorithm: byAlgo };
  }
}