// backend/src/modules/routing/dto/path-result.dto.ts
import { RoutingCriteria } from 'src/entities/routing.entity';

export class PathStepDto {
  routeId!: number;
  routeName!: string;
  fromNodeId!: number;
  fromName!: string;
  fromLat!: number;
  fromLng!: number;
  toNodeId!: number;
  toName!: string;
  toLat!: number;
  toLng!: number;
  distance!: number;
  duration!: number;
  cost!: number;
  moyenTransType!: string;
}

export class PathResultDto {
  found!: boolean;
  algorithm!: string;
  criteria!: RoutingCriteria;
  path!: PathStepDto[];
  waypoints?: { name: string; latitude: number; longitude: number }[]; // ✅ AJOUTÉ
  nodeIds!: number[];
  totalDistance!: number;
  totalDuration!: number;
  totalCost!: number;
  nodesExplored!: number;
  executionTimeMs!: number;
}

export class PreviewWaypointDto {
  name!: string;
  latitude!: number;
  longitude!: number;
}

export class PreviewPathDto {
  type!: 'DIRECT' | '2-HOP' | '3-HOP';
  routeIds!: number[];
  routeNames!: string[];
  waypoints!: PreviewWaypointDto[];
  totalDistance!: number;
  totalDuration!: number;
  totalCost!: number;
}

export class PreviewResultDto {
  startLocation!: { id: number; name: string; latitude: number; longitude: number } | null;
  endLocation!: { id: number; name: string; latitude: number; longitude: number } | null;
  paths!: PreviewPathDto[];
}