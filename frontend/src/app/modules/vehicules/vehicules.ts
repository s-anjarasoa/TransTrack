import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../core/services/api';
import { Vehicule, VehiculeStatut } from '../../core/models/vehicule.model';

export interface VehiculePayload {
  immatriculation: string;
  marque: string;
  modele: string;
  annee?: number;
  capacite: number;
  couleur?: string;
  numeroChassis?: string;
  dateAssurance?: string;
  dateVisiteTechnique?: string;
  moyenTransId: number;
}

interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

@Injectable({ providedIn: 'root' })
export class VehiculesService {
  private api = inject(ApiService);

  create(payload: VehiculePayload): Observable<Vehicule> {
    return this.api.post<Vehicule>('/vehicules', payload);
  }

  findAll(params?: Record<string, any>): Observable<PaginatedResult<Vehicule>> {
    return this.api.get<PaginatedResult<Vehicule>>('/vehicules', params);
  }

  findOne(id: number): Observable<Vehicule> {
    return this.api.get<Vehicule>(`/vehicules/${id}`);
  }

  update(id: number, payload: Partial<VehiculePayload> & { statut?: VehiculeStatut }): Observable<Vehicule> {
    return this.api.patch<Vehicule>(`/vehicules/${id}`, payload);
  }

  remove(id: number): Observable<void> {
    return this.api.delete<void>(`/vehicules/${id}`);
  }
}