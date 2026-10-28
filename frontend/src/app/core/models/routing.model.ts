// frontend/src/app/core/models/routing.model.ts
export enum RoutingCriteria {
  DISTANCE = 'DISTANCE',
  DUREE = 'DUREE',
  PRIX = 'PRIX',
}

export enum RoutingAlgorithm {
  A_STAR = 'A_STAR',
  DIJKSTRA = 'DIJKSTRA',
}

export interface PathStep {
  routeId: number;
  routeName: string;
  fromNodeId: number;
  fromName: string;
  fromLat: number;
  fromLng: number;
  toNodeId: number;
  toName: string;
  toLat: number;
  toLng: number;
  distance: number;
  duration: number;
  cost: number;
  moyenTransType: string;
}

export interface PathResult {
  found: boolean;
  algorithm: RoutingAlgorithm;
  criteria: RoutingCriteria;
  path: PathStep[];
  waypoints?: { name: string; latitude: number; longitude: number }[]; 
  nodeIds: number[];
  totalDistance: number;
  totalDuration: number;
  totalCost: number;
  nodesExplored: number;
  executionTimeMs: number;
}

export interface PreviewWaypoint {
  name: string;
  latitude: number;
  longitude: number;
}

export interface PreviewPath {
  type: 'DIRECT' | '2-HOP' | '3-HOP';
  routeIds: number[];
  routeNames: string[];
  waypoints: PreviewWaypoint[];
  totalDistance: number;
  totalDuration: number;
  totalCost: number;
}

export interface PreviewResult {
  startLocation: { id: number; name: string; latitude: number; longitude: number } | null;
  endLocation: { id: number; name: string; latitude: number; longitude: number } | null;
  paths: PreviewPath[];
}

export interface ComparePathStep {
  routeId: number;
  routeName: string;
  fromNodeId: number;
  fromName: string;
  fromLat: number;
  fromLng: number;
  toNodeId: number;
  toName: string;
  toLat: number;
  toLng: number;
}

export interface AlgorithmRun {
  found: boolean;
  executionTimeMs: number;
  nodesExplored: number;
  totalDistance: number;
  totalDuration: number;
  totalCost: number;
  pathLength: number;
  path: ComparePathStep[];
  waypoints?: { name: string; latitude: number; longitude: number }[];
}

export interface CompareResult {
  criteria: RoutingCriteria;
  astar: AlgorithmRun;
  dijkstra: AlgorithmRun;
  gain: {
    nodesSaved: number;
    nodesSavedPercent: number;
    timeSavedMs: number;
    sameResult: boolean;
  };
}

export interface LocationLite {
  id: number;
  name: string;
  province?: string;
  region?: string;
  latitude?: number;
  longitude?: number;
}