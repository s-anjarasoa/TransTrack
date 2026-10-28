import { RoutingCriteria } from 'src/entities/routing.entity';
import { Graph, GraphEdge } from '../utils/graph.types';
import { AStarResult, weightOf } from './astar.algorithm';
import { PriorityQueue } from './priority-queue';

export function dijkstra(
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

  if (!graph.nodes.has(startId) || !graph.nodes.has(goalId)) {
    return {
      found: false, path: [], nodeIds: [],
      totalDistance: 0, totalDuration: 0, totalCost: 0, nodesExplored: 0,
    };
  }

  const gScore = new Map<number, number>();
  gScore.set(startId, 0);

  const cameFrom = new Map<number, GraphEdge>();
  const closed = new Set<number>();
  let nodesExplored = 0;

  const open = new PriorityQueue<{ nodeId: number; g: number }>();
  open.push(0, { nodeId: startId, g: 0 });

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
        open.push(tentativeG, { nodeId: edge.toNodeId, g: tentativeG });
      }
    }
  }

  if (!cameFrom.has(goalId)) {
    return {
      found: false, path: [], nodeIds: [],
      totalDistance: 0, totalDuration: 0, totalCost: 0, nodesExplored,
    };
  }

  const path: GraphEdge[] = [];
  const nodeIds: number[] = [goalId];
  let cur = goalId;
  while (cameFrom.has(cur)) {
    const e = cameFrom.get(cur)!;
    path.unshift(e);
    nodeIds.unshift(e.fromNodeId);
    cur = e.fromNodeId;
  }

  const sum = (pick: (e: GraphEdge) => number) =>
    Math.round(path.reduce((s, e) => s + pick(e), 0) * 100) / 100;

  return {
    found: true,
    path,
    nodeIds,
    totalDistance: sum(e => e.distance),
    totalDuration: sum(e => e.duration),
    totalCost: sum(e => e.cost),
    nodesExplored,
  };
}