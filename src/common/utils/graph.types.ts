export interface GraphNode {
  locationId: number;
  name: string;
  latitude: number;
  longitude: number;
}

export interface GraphEdge {
  fromNodeId: number;
  toNodeId: number;
  routeId: number;
  routeName: string;
  distance: number;   // km
  duration: number;   // minutes
  cost: number;       // Ariary
  moyenTransType: string;
}

export interface Graph {
  nodes: Map<number, GraphNode>;
  adjacency: Map<number, GraphEdge[]>;
  maxSpeedKmPerMin: number;
  minPricePerKm: number;
}