import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../core/services/api';
import { PaymentContext } from '../../core/models/paiement.model';

// ✅ Traduction en français
export type PaymentStatus =
  | 'EN_ATTENTE'
  | 'VALIDE'
  | 'ECHOUE'
  | 'ANNULE'
  | 'EXPIRE'
  | 'REMBOURSE';

// ✅ Traduction en français
export type SimulationOutcome = 'SUCCES' | 'ECHEC' | 'ANNULATION';
export type SimulatedMethod = 'MVOLA' | 'ORANGE_MONEY' | 'AIRTEL_MONEY' | 'CARD';

export interface PaymentView {
  reference: string;
  status: PaymentStatus;
  amount: number;
  currency: string;
  description: string | null;
  provider: string | null;
  purposeType: string | null;
  purposeId: number | null;
  expiresAt: string | null;
  expiresInSeconds: number;
  paidAt: string | null;
  fulfilledAt: string | null;
  returnPath: string | null;
  context?: PaymentContext;
}

export interface SimulatePayload {
  outcome: SimulationOutcome;
  method?: SimulatedMethod;
  phone?: string;
}

@Injectable({ providedIn: 'root' })
export class PaymentGatewayService {
  private api = inject(ApiService);

  getStatus(reference: string): Observable<PaymentView> {
    return this.api.get<PaymentView>(`/payments/${reference}`);
  }

  simulate(reference: string, payload: SimulatePayload): Observable<PaymentView> {
    return this.api.post<PaymentView>(`/payments/${reference}/simulate`, payload);
  }
}