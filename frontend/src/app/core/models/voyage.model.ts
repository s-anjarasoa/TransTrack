export enum VoyageStatut {
  PLANIFIE = 'PLANIFIE',
  EN_COURS = 'EN_COURS',
  TERMINE = 'TERMINE',
  ANNULE = 'ANNULE',
  RETARDE = 'RETARDE',
  COMPLET = 'COMPLET',
}

export interface VoyageStatusHistoryEntry {
  id: number;
  voyageId: number;
  ancienStatut?: VoyageStatut;
  nouveauStatut: VoyageStatut;
  motif?: string;
  agentId?: number;
  agent?: {
    id: number;
    user?: { firstName?: string; lastName?: string };
  };
  createdAt: string;
}

export interface Voyage {
  id: number;
  codeVoyage: string;
  dateDepart: string;
  dateArrivee: string;
  prix: number;
  placesTotales: number;
  placesDisponibles: number;
  statut: VoyageStatut;
  retardMinutes?: number;
  motifAnnulation?: string;
  notes?: string;
  societeId: number;
  societe?: { id: number; nom: string };

  categorie?: 'CLASSE' | 'ECONOMIE'; // Utilisé pour les bus
  prixClasse?: number;
  prixEconomie?: number;
  placesClasseTotales?: number;
  placesClasseDisponibles?: number;
  placesEconomieTotales?: number;
  placesEconomieDisponibles?: number;
  iaScore?: number;
  routeId: number;
  route?: { 
    id: number; 
    depart: string; 
    arrivee: string; 
    moyenTransId: number; 
    distance?: number; 
    dureeEstimee?: number;
    moyenTrans?: { type: string; nom: string };
    societe?: { id: number; nom: string };
    stops?: { 
      id: number; 
      locationId: number;
      location?: { 
        name: string; 
        latitude?: number; 
        longitude?: number; 
      } 
    }[];  
  };

  vehiculeId: number;
  vehicule?: { id: number; immatriculation: string; marque: string; modele: string; capacite: number };

  chauffeurId?: number;
  chauffeur?: { id: number; user?: { firstName?: string; lastName?: string } };

  statusHistory?: VoyageStatusHistoryEntry[];
  reservations?: any[];

  createdAt: string;
  updatedAt: string;
}

export interface CreateVoyagePayload {
  dateDepart: string;
  dateArrivee: string;
  routeId: number;
  vehiculeId: number;
  placesClasse?: number; // ✅ Pour les transports mixtes
  chauffeurId?: number;
  notes?: string;
}