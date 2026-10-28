export enum RouteStatut {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDUE = 'SUSPENDUE',
}

export enum RouteStopType {
  DEPART = 'DEPART',
  INTERMEDIAIRE = 'INTERMEDIAIRE',
  ARRIVEE = 'ARRIVEE',
}

export interface RouteStop {
  id?: number;
  routeId?: number;
  locationId: number;
  ordre: number;
  type?: RouteStopType;
  heureDepartRel?: number;
  heureArriveeRel?: number;
  distanceDepuisDepart?: number;
  description?: string;
  // Relation chargée en réponse
  location?: {
    id: number;
    name: string;
    type: string;
    province?: string;
    region?: string;
    latitude?: number;
    longitude?: number;
  };
}

export interface Route {
  id: number;
  nom?: string;
  depart: string;
  arrivee: string;
  pointDepart?: string;
  pointArrivee?: string;
  distance?: number;
  dureeEstimee?: number;
  statut: RouteStatut;
  description?: string;
  societeId?: number;
  moyenTransId: number;
  moyenTrans?: {
    id: number;
    nom: string;
    type: string;
  };
  stops: RouteStop[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateRoutePayload {
  nom?: string;
  moyenTransId: number;
  societeId?: number;
  dureeEstimee?: number;
  statut?: RouteStatut;
  description?: string;
  stops: {
    locationId: number;
    ordre: number;
    heureDepartRel?: number;
    heureArriveeRel?: number;
    description?: string;
  }[];
}

export interface PaginatedRoutes {
  data: Route[];
  total: number;
  page: number;
  limit: number;
}