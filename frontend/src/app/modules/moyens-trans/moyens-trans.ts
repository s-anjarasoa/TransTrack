import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../core/services/api';
import { MoyenTrans, MoyenTransType } from '../../core/models/moyen-trans.model';

export interface MoyenTransPayload {
  type: MoyenTransType;
  nom: string;
  description?: string;
}

interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

@Injectable({ providedIn: 'root' })
export class MoyensTransService {
  private api = inject(ApiService);

  create(payload: MoyenTransPayload): Observable<MoyenTrans> {
    return this.api.post<MoyenTrans>('/moyens-trans', payload);
  }

  findAll(params?: Record<string, any>): Observable<PaginatedResult<MoyenTrans>> {
    return this.api.get<PaginatedResult<MoyenTrans>>('/moyens-trans', params);
  }

  findOne(id: number): Observable<MoyenTrans> {
    return this.api.get<MoyenTrans>(`/moyens-trans/${id}`);
  }

  update(id: number, payload: Partial<MoyenTransPayload> & { isActif?: boolean }): Observable<MoyenTrans> {
    return this.api.patch<MoyenTrans>(`/moyens-trans/${id}`, payload);
  }

  remove(id: number): Observable<void> {
    return this.api.delete<void>(`/moyens-trans/${id}`);
  }
}