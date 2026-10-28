import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../core/services/api';
import { Client } from '../../core/models/client.model';

export interface ClientProfilePayload {
  phone?: string;
  address: string;
  CIN: string;
  passport: string;
}

interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

@Injectable({ providedIn: 'root' })
export class ClientsService {
  private api = inject(ApiService);

  me(): Observable<Client> {
    return this.api.get<Client>('/clients/me');
  }

  createMe(payload: ClientProfilePayload): Observable<Client> {
    return this.api.post<Client>('/clients/me', payload);
  }

  updateMe(payload: ClientProfilePayload): Observable<Client> {
    return this.api.patch<Client>('/clients/me', payload);
  }

  findAll(params?: Record<string, any>): Observable<PaginatedResult<Client>> {
    return this.api.get<PaginatedResult<Client>>('/clients', params);
  }

  findOne(id: number): Observable<Client> {
    return this.api.get<Client>(`/clients/${id}`);
  }

  remove(id: number): Observable<void> {
    return this.api.delete<void>(`/clients/${id}`);
  }
}