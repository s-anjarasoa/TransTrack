export type PaymentReason = 'ABONNEMENT' | 'RESERVATION' | 'REMBOURSEMENT' | 'AUTRE';

export interface PaymentContext {
  reason: PaymentReason;
  objectName: string;      // Ex: "Abonnement Mensuel" ou "Voyage Antananarivo - Toliara"
  objectId?: string | number; // Ex: ID de la société ou de la réservation
  
  senderName: string;      // Ex: Nom du client ou de la société
  senderPhone?: string;
  
  receiverName: string;    // Ex: "TransTrack Admin" ou Nom de la société
  receiverPhone?: string;
}

export interface PaymentView {
  reference: string;
  status: string;
  amount: number;
  description: string;
  expiresInSeconds: number;
  returnPath?: string;
  context?: PaymentContext; // ✅ NOUVEAU
}