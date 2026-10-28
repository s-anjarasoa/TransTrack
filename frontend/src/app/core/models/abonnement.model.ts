export enum AbonnementType {
  MENSUEL = 'MENSUEL',
  ANNUELLE = 'ANNUELLE',
}

export interface Abonnement {
  id: number;
  type: AbonnementType;
  societeId: number;
  societe?: { 
    id: number;
    name: string;
    directeur?: {
      id: number;
      user?: { firstName: string; lastName: string; email: string };
    }
  };
  tarif: number;
  isActif: boolean;
  dateDebut?: Date;
  dateFin?: Date;
  createdAt: Date;
}