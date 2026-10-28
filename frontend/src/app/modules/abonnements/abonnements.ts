import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../core/services/api';
import { Abonnement } from '../../core/models/abonnement.model';

export type PlanType = 'MENSUEL' | 'ANNUELLE';

export interface Plan {
  type: PlanType;
  label: string;
  duration: string;
  price: number;
}

export interface CheckoutResponse {
  abonnementId: number;
  reference: string;
  status: string;
  amount: number;
  currency: string;
  checkoutUrl: string | null;
  instructions: string | null;
  expiresAt: string;
}

interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

@Injectable({ providedIn: 'root' })
export class SubscriptionsService {
  private api = inject(ApiService);

  plans(): Observable<Plan[]> {
    return this.api.get<Plan[]>('/subscriptions/plans');
  }

  // ✅ NOUVELLE MÉTHODE : Récupérer l'historique des abonnements
  findAll(params?: Record<string, any>): Observable<PaginatedResult<Abonnement>> {
    return this.api.get<PaginatedResult<Abonnement>>('/subscriptions', params);
  }

  subscribe(type: PlanType, societeId?: number): Observable<CheckoutResponse> {
    return this.api.post<CheckoutResponse>('/subscriptions/subscribe', {
      type,
      ...(societeId ? { societeId } : {}),
    });
  }

  pay(abonnementId: number): Observable<CheckoutResponse> {
    return this.api.post<CheckoutResponse>(`/subscriptions/${abonnementId}/pay`, {});
  }
}