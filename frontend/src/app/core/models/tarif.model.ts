export enum TarifCategorie {
  CLASSE = 'CLASSE',
  ECONOMIE = 'ECONOMIE',
}

export enum TarifType {
  NORMAL = 'NORMAL',
  PROMOTION = 'PROMOTION',
}

export interface Tarif {
  id: number;
  categorie: TarifCategorie;
  type: TarifType;
  prix: number;
  prixPromo?: number;
  dateDebut?: string;
  dateFin?: string;
  isActif: boolean;
  routeId: number;
  route?: { id: number; depart: string; arrivee: string };
  societeId: number;
  createdAt: Date;
  nbVoyages?: number; 
}