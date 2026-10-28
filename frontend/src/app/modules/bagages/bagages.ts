import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../core/services/api';
import { Bagage, BagageType } from '../../core/models/bagage.model';


export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

@Injectable({ providedIn: 'root' })
export class BagagesService {
  private api = inject(ApiService);

  findAll(params?: Record<string, any>): Observable<PaginatedResult<Bagage>> {
    return this.api.get<PaginatedResult<Bagage>>('/bagages', params);
  }

  getByReservation(reservationId: number): Observable<Bagage[]> {
    return this.api.get<Bagage[]>(`/bagages/reservation/${reservationId}`);
  }

  create(payload: { reservationId: number; type: BagageType; poids: number; description?: string }): Observable<Bagage> {
    return this.api.post<Bagage>('/bagages', payload);
  }
}