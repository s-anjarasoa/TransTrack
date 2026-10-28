export enum ReservationStatut {
  EN_ATTENTE = 'EN_ATTENTE',
  CONFIRMEE = 'CONFIRMEE',
  PAYEE = 'PAYEE',
  ANNULEE = 'ANNULEE',
  REMBOURSEE = 'REMBOURSEE',
  TERMINEE = 'TERMINEE',
}

export enum ReservationSource {
  EN_LIGNE = 'EN_LIGNE',
  GUICHET = 'GUICHET',
  TELEPHONE = 'TELEPHONE',
  AGENCE = 'AGENCE',
}

export interface Reservation {
  id: number;
  codeReservation: string;
  nombrePlaces: number;
  prixTotal: number;
  statut: ReservationStatut;
  source: ReservationSource;
  dateReservation: string;
  dateConfirmation?: string;
  dateAnnulation?: string;
  motifAnnulation?: string;
  notes?: string;
  
  // ✅ AJOUT : La catégorie choisie (uniquement pour Avion/Train)
  categorie?: 'CLASSE' | 'ECONOMIE'; 
  
  clientId: number;
  client?: { id: number; user?: { firstName?: string; lastName?: string; email?: string } };
  
  voyageId: number;
  voyage?: {
    id: number;
    codeVoyage: string;
    dateDepart: string;
    dateArrivee: string;
    statut: string;
    
    // ✅ AJOUT : Les prix et places par catégorie pour l'affichage
    prix: number;
    prixClasse?: number;
    prixEconomie?: number;
    placesClasseDisponibles?: number;
    placesEconomieDisponibles?: number;

    route?: { depart: string; arrivee: string };
    societeId: number;
    societe?: { nom: string };
  };
  
  createdAt: Date;
}