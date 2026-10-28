import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../core/services/api';
import { Reservation } from '../../core/models/reservation.model';

export interface CreateReservationPayload {
  voyageId: number;
  nombrePlaces: number;
  notes?: string;
  categorie?: 'CLASSE' | 'ECONOMIE';
   recommendationContext?: any; 
}

interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

@Injectable({ providedIn: 'root' })
export class ReservationsService {
  private api = inject(ApiService);

  create(payload: CreateReservationPayload): Observable<Reservation> {
    return this.api.post<Reservation>('/reservations', payload);
  }

  findAll(params?: Record<string, any>): Observable<PaginatedResult<Reservation>> {
    return this.api.get<PaginatedResult<Reservation>>('/reservations', params);
  }

  findOne(id: number): Observable<Reservation> {
    return this.api.get<Reservation>(`/reservations/${id}`);
  }

  confirm(id: number): Observable<Reservation> {
    return this.api.patch<Reservation>(`/reservations/${id}/confirm`, {});
  }

  cancel(id: number, motifAnnulation?: string): Observable<Reservation> {
    return this.api.patch<Reservation>(`/reservations/${id}/cancel`, { motifAnnulation });
  }

  payer(id: number): Observable<any> {
    return this.api.post<any>(`/reservations/${id}/payer`, {});
  }
}