import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../core/services/api';
import { Societe, SocieteStatut } from '../../core/models/societe.model';

export interface CreateSocietePayload {
  name: string;
  phone: string;
  email: string;
  address: string;
  nif: string;
  numState: string;
}

export interface UpdateSocietePayload {
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
  nif?: string;
  numState?: string;
}

export interface ValidateSocietePayload {
  statut: SocieteStatut.VALIDEE | SocieteStatut.REJETEE;
  reason?: string;
}

interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

@Injectable({ providedIn: 'root' })
export class SocietesService {
  private api = inject(ApiService);

  create(payload: CreateSocietePayload): Observable<Societe> {
    return this.api.post<Societe>('/societes', payload);
  }
  
  findAllPublic(filters?: any): Observable<{ data: Societe[]; total: number }> {
  return this.api.get<{ data: Societe[]; total: number }>('/societes/public', filters);
  } 

  // ✅ Méthode pour mettre à jour une société
  update(id: number, payload: UpdateSocietePayload): Observable<Societe> {
    return this.api.patch<Societe>(`/societes/${id}`, payload);
  }

  findAll(params?: Record<string, any>): Observable<PaginatedResult<Societe>> {
    return this.api.get<PaginatedResult<Societe>>('/societes', params);
  }

  findOne(id: number): Observable<Societe> {
    return this.api.get<Societe>(`/societes/${id}`);
  }

  validate(id: number, payload: ValidateSocietePayload): Observable<Societe> {
    return this.api.patch<Societe>(`/societes/${id}/validate`, payload);
  }

  regenerateCode(id: number): Observable<{ codeInvitation: string }> {
    return this.api.post<{ codeInvitation: string }>(`/societes/${id}/regenerate-code`, {});
  }

  payerAbonnement(id: number, type: string = 'MENSUEL'): Observable<any> {
    return this.api.post<any>(`/societes/${id}/payer-abonnement`, { type });
  }

  delete(id: number): Observable<void> {
    return this.api.delete<void>(`/societes/${id}`);
  }

   remove(id: number): Observable<void> {
    return this.delete(id);
  }
}