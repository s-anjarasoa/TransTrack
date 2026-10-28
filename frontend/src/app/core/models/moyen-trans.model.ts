export enum MoyenTransType {
  BUS = 'BUS',
  TRAIN = 'TRAIN',
  BATEAU = 'BATEAU',
  AVION = 'AVION',
  TAXI = 'TAXI',
  TAXI_BROUSSE = 'TAXI_BROUSSE',
  FERRY = 'FERRY',
  CAMION = 'CAMION',
}

export interface MoyenTrans {
  id: number;
  type: MoyenTransType;
  nom: string;
  description?: string;
  isActif: boolean;
  societeId: number;
  societe?: { name: string };
  createdAt: Date;
}