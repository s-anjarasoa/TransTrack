import { Paiement } from '../../entities/paiement.entity';

/** Ce que le paiement règle (extensible : ajouter une valeur par usage) */
export enum PaymentPurpose {
  ABONNEMENT = 'ABONNEMENT',
  RESERVATION = 'RESERVATION',
}

export type ProviderOutcome = 'SUCCES' | 'ECHEC' | 'ANNULE';

// ✅ NOUVEAU : Contexte du paiement
export type PaymentReason = 'ABONNEMENT' | 'RESERVATION' | 'REMBOURSEMENT' | 'AUTRE';

export interface PaymentContext {
  reason: PaymentReason;
  objectName: string;
  objectId?: string | number;
  senderName: string;
  senderPhone?: string;
  receiverName: string;
  receiverPhone?: string;
}

export interface InitiatePaymentInput {
  reference: string;
  amount: number;
  currency: string;
  description: string;
}

export interface InitiatePaymentResult {
  providerRef?: string;
  checkoutUrl?: string;
  instructions?: string;
}

export interface ProviderEvent {
  reference: string;
  status: ProviderOutcome;
  amount?: number;
  providerRef?: string;
  raw?: unknown;
}

export interface PaymentProvider {
  readonly name: string;
  initiate(input: InitiatePaymentInput): Promise<InitiatePaymentResult>;
  parseWebhook(headers: Record<string, unknown>, body: unknown): ProviderEvent;
}

export interface PaymentOutcomeHandler {
  onPaymentSucceeded(paiement: Paiement): Promise<void>;
  onPaymentFailed?(paiement: Paiement): Promise<void>;
}

export interface CreateCheckoutInput {
  purposeType: PaymentPurpose;
  purposeId: number;
  userId: number;
  amount: number;
  description: string;
  currency?: string;
  returnPath?: string;
}

export interface CheckoutResult {
  reference: string;
  status: string;
  amount: number;
  currency: string;
  checkoutUrl: string | null;
  instructions: string | null;
  expiresAt: Date;
}