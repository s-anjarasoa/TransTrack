export enum BagageType { MAIN = 'MAIN', CABINE = 'CABINE', SOUTE = 'SOUTE', SPECIAL = 'SPECIAL' }

export interface Bagage {
  id: number;
  type: BagageType;
  poids: number;
  description?: string;
  supplementPrix: number;
  numeroEtiquette: string;
  reservationId: number;
}