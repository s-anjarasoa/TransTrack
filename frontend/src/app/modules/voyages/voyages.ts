import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../core/services/api';
import { Voyage, CreateVoyagePayload, VoyageStatut } from '../../core/models/voyage.model';

// ✅ On l'exporte pour que voyage-search et voyage-form puissent l'utiliser
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

@Injectable({ providedIn: 'root' })
export class VoyagesService {
  private api = inject(ApiService);

  create(payload: CreateVoyagePayload): Observable<Voyage> {
    return this.api.post<Voyage>('/voyages', payload);
  }

  findAll(params?: Record<string, any>): Observable<PaginatedResult<Voyage>> {
    return this.api.get<PaginatedResult<Voyage>>('/voyages', params);
  }

  // ✅ AJOUT : nécessaire pour le formulaire de création (admin/agent)
  findMine(params?: Record<string, any>): Observable<PaginatedResult<Voyage>> {
    return this.api.get<PaginatedResult<Voyage>>('/voyages/mine', params);
  }

  // ✅ AJOUT : nécessaire pour la recherche client
  search(params?: Record<string, any>): Observable<PaginatedResult<Voyage>> {
    return this.api.get<PaginatedResult<Voyage>>('/voyages/search', params);
  }

  searchPublic(params?: Record<string, any>): Observable<PaginatedResult<Voyage>> {
    return this.api.get<PaginatedResult<Voyage>>('/voyages/search', params);
  }

  findOne(id: number): Observable<Voyage> {
    return this.api.get<Voyage>(`/voyages/${id}`);
  }

  update(id: number, payload: Partial<CreateVoyagePayload>): Observable<Voyage> {
    return this.api.patch<Voyage>(`/voyages/${id}`, payload);
  }

  changeStatus(id: number, statut: VoyageStatut, motif?: string, retard?: number): Observable<Voyage> {
    return this.api.patch<Voyage>(`/voyages/${id}/status`, { statut, motifAnnulation: motif, retardMinutes: retard });
  }

  remove(id: number): Observable<void> {
    return this.api.delete<void>(`/voyages/${id}`);
  }
}