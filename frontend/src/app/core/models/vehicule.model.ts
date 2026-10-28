export enum VehiculeStatut {
  DISPONIBLE = 'DISPONIBLE',
  EN_SERVICE = 'EN_SERVICE',
  EN_MAINTENANCE = 'EN_MAINTENANCE',
  HORS_SERVICE = 'HORS_SERVICE',
}

export interface Vehicule {
  id: number;
  immatriculation: string;
  marque: string;
  modele: string;
  annee?: number;
  capacite: number;
  statut: VehiculeStatut;
  couleur?: string;
  numeroChassis?: string;
  dateAssurance?: string;
  dateVisiteTechnique?: string;
  isActif: boolean;
  societeId: number;
  moyenTransId: number;
  moyenTrans?: { id: number; nom: string; type: string };
  createdAt: Date;
}