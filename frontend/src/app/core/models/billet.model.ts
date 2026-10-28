export enum BilletStatut { VALIDE = 'VALIDE', UTILISE = 'UTILISE', ANNULE = 'ANNULE' }
export enum BilletCategorie { ADULTE = 'ADULTE', ENFANT = 'ENFANT', ETUDIANT = 'ETUDIANT', SENIOR = 'SENIOR', VIP = 'VIP' }

export interface Billet {
  id: number;
  numeroBillet: string;
  numeroPlace?: string;
  categorie: BilletCategorie;
  statut: BilletStatut;
  prix: number;
  qrCode?: string;
  reservationId: number;
}