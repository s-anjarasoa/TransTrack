import { RoutingCriteria } from 'src/entities/routing.entity';
import { Graph, GraphEdge, GraphNode } from '../utils/graph.types';
import { PriorityQueue } from './priority-queue';

export interface AStarResult {
  found: boolean;
  path: GraphEdge[];
  nodeIds: number[];
  totalDistance: number;
  totalDuration: number;
  totalCost: number;
  nodesExplored: number;
}

export function astar(
  graph: Graph,
  startId: number,
  goalId: number,
  criteria: RoutingCriteria,
): AStarResult {
  if (startId === goalId) {
    return {
      found: true, path: [], nodeIds: [startId],
      totalDistance: 0, totalDuration: 0, totalCost: 0, nodesExplored: 0,
    };
  }

  const start = graph.nodes.get(startId);
  const goal = graph.nodes.get(goalId);
  if (!start || !goal) return emptyResult();

  const h = makeHeuristic(goal, criteria, graph);

  const gScore = new Map<number, number>();
  gScore.set(startId, 0);

  const cameFrom = new Map<number, GraphEdge>();
  const closed = new Set<number>();
  let nodesExplored = 0;

  const open = new PriorityQueue<{ nodeId: number; g: number }>();
  open.push(h(startId), { nodeId: startId, g: 0 });

  while (!open.isEmpty()) {
    const current = open.pop()!;
    if (closed.has(current.nodeId)) continue;
    if (current.nodeId === goalId) break;
    closed.add(current.nodeId);
    nodesExplored++;

    const neighbors = graph.adjacency.get(current.nodeId) ?? [];
    for (const edge of neighbors) {
      if (closed.has(edge.toNodeId)) continue;

      const tentativeG = current.g + weightOf(edge, criteria);
      const knownG = gScore.get(edge.toNodeId) ?? Infinity;

      if (tentativeG < knownG) {
        gScore.set(edge.toNodeId, tentativeG);
        cameFrom.set(edge.toNodeId, edge);
        open.push(tentativeG + h(edge.toNodeId), {
          nodeId: edge.toNodeId, g: tentativeG,
        });
      }
    }
  }

  if (!cameFrom.has(goalId)) return { ...emptyResult(), nodesExplored };

  const path: GraphEdge[] = [];
  const nodeIds: number[] = [goalId];
  let cur = goalId;
  while (cameFrom.has(cur)) {
    const e = cameFrom.get(cur)!;
    path.unshift(e);
    nodeIds.unshift(e.fromNodeId);
    cur = e.fromNodeId;
  }

  return {
    found: true,
    path,
    nodeIds,
    totalDistance: sum(path, e => e.distance),
    totalDuration: sum(path, e => e.duration),
    totalCost: sum(path, e => e.cost),
    nodesExplored,
  };
}

export function weightOf(edge: GraphEdge, criteria: RoutingCriteria): number {
  switch (criteria) {
    case RoutingCriteria.DISTANCE: return edge.distance;
    case RoutingCriteria.DUREE:    return edge.duration;
    case RoutingCriteria.PRIX:     return edge.cost;
  }
}

export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function makeHeuristic(
  goal: GraphNode,
  criteria: RoutingCriteria,
  graph: Graph,
): (nodeId: number) => number {
  return (nodeId: number) => {
    const n = graph.nodes.get(nodeId);
    if (!n) return 0;
    const d = haversineKm(n.latitude, n.longitude, goal.latitude, goal.longitude);
    switch (criteria) {
      case RoutingCriteria.DISTANCE: return d;
      case RoutingCriteria.DUREE:    return d / graph.maxSpeedKmPerMin;
      case RoutingCriteria.PRIX:     return d * graph.minPricePerKm;
    }
  };
}

function sum<T>(arr: T[], pick: (t: T) => number): number {
  return Math.round(arr.reduce((s, x) => s + pick(x), 0) * 100) / 100;
}

function emptyResult(): AStarResult {
  return {
    found: false, path: [], nodeIds: [],
    totalDistance: 0, totalDuration: 0, totalCost: 0, nodesExplored: 0,
  };
}