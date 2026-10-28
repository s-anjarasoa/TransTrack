import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../core/services/api';
import { Tarif, TarifCategorie, TarifType } from '../../core/models/tarif.model';

export interface TarifPayload {
  categorie: TarifCategorie;
  type?: TarifType;
  prix: number;
  prixPromo?: number;
  dateDebut?: string;
  dateFin?: string;
  routeId: number;
}

interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

@Injectable({ providedIn: 'root' })
export class TarifsService {
  private api = inject(ApiService);

  create(payload: TarifPayload): Observable<Tarif> {
    return this.api.post<Tarif>('/tarifs', payload);
  }

  findAll(params?: Record<string, any>): Observable<PaginatedResult<Tarif>> {
    return this.api.get<PaginatedResult<Tarif>>('/tarifs', params);
  }

  findOne(id: number): Observable<Tarif> {
    return this.api.get<Tarif>(`/tarifs/${id}`);
  }

  update(id: number, payload: Partial<TarifPayload> & { isActif?: boolean }): Observable<Tarif> {
    return this.api.patch<Tarif>(`/tarifs/${id}`, payload);
  }

  remove(id: number): Observable<void> {
    return this.api.delete<void>(`/tarifs/${id}`);
  }
}