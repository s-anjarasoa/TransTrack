import { LocationType } from '../../../entities/location.entity';

export const MADAGASCAR_CITIES = [
  // ──────── Province Antananarivo ────────
  { name: 'Antananarivo', type: LocationType.CITY, province: 'Antananarivo', region: 'Analamanga', latitude: -18.9137, longitude: 47.5361 },
  { name: 'Antsirabe',    type: LocationType.CITY, province: 'Antananarivo', region: 'Vakinankaratra', latitude: -19.8659, longitude: 47.0333 },
  { name: 'Tsiroanomandidy', type: LocationType.CITY, province: 'Antananarivo', region: 'Bongolava', latitude: -18.7698, longitude: 46.0500 },

  // ──────── Province Toamasina ────────
  { name: 'Toamasina',  type: LocationType.CITY, province: 'Toamasina', region: 'Atsinanana', latitude: -18.1499, longitude: 49.4023 },
  { name: 'Moramanga',  type: LocationType.CITY, province: 'Toamasina', region: 'Alaotra-Mangoro', latitude: -18.9497, longitude: 48.2303 },
  { name: 'Ambatondrazaka', type: LocationType.CITY, province: 'Toamasina', region: 'Alaotra-Mangoro', latitude: -17.8333, longitude: 48.4167 },

  // ──────── Province Fianarantsoa ────────
  { name: 'Fianarantsoa', type: LocationType.CITY, province: 'Fianarantsoa', region: 'Haute Matsiatra', latitude: -21.4527, longitude: 47.0857 },
  { name: 'Manakara',    type: LocationType.CITY, province: 'Fianarantsoa', region: 'Vatovavy-Fitovinany', latitude: -22.1333, longitude: 48.0167 },
  { name: 'Ambositra',   type: LocationType.CITY, province: 'Fianarantsoa', region: 'Amoron\'i Mania', latitude: -20.5333, longitude: 47.2500 },

  // ──────── Province Mahajanga ────────
  { name: 'Mahajanga', type: LocationType.CITY, province: 'Mahajanga', region: 'Boeny', latitude: -15.7167, longitude: 46.3167 },
  { name: 'Marovoay',  type: LocationType.CITY, province: 'Mahajanga', region: 'Boeny', latitude: -16.1000, longitude: 46.6333 },

  // ──────── Province Toliara ────────
  { name: 'Toliara',   type: LocationType.CITY, province: 'Toliara', region: 'Atsimo-Andrefana', latitude: -23.3568, longitude: 43.6667 },
  { name: 'Morondava', type: LocationType.CITY, province: 'Toliara', region: 'Menabe', latitude: -20.2833, longitude: 44.2833 },

  // ──────── Province Antsiranana ────────
  { name: 'Antsiranana', type: LocationType.CITY, province: 'Antsiranana', region: 'Diana', latitude: -12.2795, longitude: 49.2913 },
  { name: 'Nosy Be',     type: LocationType.CITY, province: 'Antsiranana', region: 'Diana', latitude: -13.3167, longitude: 48.2667 },

  // ──────── Points d'intérêt ────────
  { name: 'Gare Routière Ampasampito', type: LocationType.STATION, province: 'Antananarivo', region: 'Analamanga', latitude: -18.9067, longitude: 47.5244 },
  { name: 'Aéroport Ivato', type: LocationType.AIRPORT, province: 'Antananarivo', region: 'Analamanga', latitude: -18.7969, longitude: 47.4788 },
  { name: 'Port de Toamasina', type: LocationType.PORT, province: 'Toamasina', region: 'Atsinanana', latitude: -18.1499, longitude: 49.4167 },
];