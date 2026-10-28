export interface ProvinceInfo {
  center: [number, number];
  zoom: number;
  regions: string[];
}

export const MADAGASCAR_PROVINCES: Record<string, ProvinceInfo> = {
  Antananarivo: {
    center: [-18.9, 47.0],
    zoom: 8,
    regions: ['Analamanga', 'Vakinankaratra', 'Bongolava', 'Itasy'],
  },
  Antsiranana: {
    center: [-13.0, 49.5],
    zoom: 8,
    regions: ['Diana', 'Sava'],
  },
  Fianarantsoa: {
    center: [-21.5, 47.0],
    zoom: 8,
    regions: [
      'Haute Matsiatra',
      "Amoron'i Mania",
      'Vatovavy-Fitovinany',
      'Ihorombe',
      'Atsimo-Atsinanana',
    ],
  },
  Mahajanga: {
    center: [-16.0, 46.5],
    zoom: 8,
    regions: ['Boeny', 'Betsiboka', 'Melaky', 'Sofia'],
  },
  Toamasina: {
    center: [-17.5, 49.0],
    zoom: 8,
    regions: ['Atsinanana', 'Analanjirofo', 'Alaotra-Mangoro'],
  },
  Toliara: {
    center: [-23.0, 44.5],
    zoom: 8,
    regions: ['Atsimo-Andrefana', 'Androy', 'Anosy', 'Menabe'],
  },
};