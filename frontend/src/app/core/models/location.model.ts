export enum LocationType {
  CITY = 'CITY',
  VILLAGE = 'VILLAGE',
  STATION = 'STATION',
  PORT = 'PORT',
  AIRPORT = 'AIRPORT',
  TRAINSTATION = 'TRAINSTATION',
  STOP = 'STOP',
}

export interface Location {
  id: number;
  name: string;
  type: LocationType;
  province?: string;
  region?: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  isActive: boolean;
  societeId?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface PaginatedLocations {
  data: Location[];
  total: number;
  page: number;
  limit: number;
}