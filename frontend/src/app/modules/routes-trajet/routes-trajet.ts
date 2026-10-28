import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../core/services/api';
import { CreateRoutePayload, PaginatedRoutes, Route } from '../../core/models/route.model';



@Injectable({ providedIn: 'root' })
export class RoutesService {
  private api = inject(ApiService);

  findAll(params?: Record<string, any>): Observable<PaginatedRoutes> {
    return this.api.get<PaginatedRoutes>('/routes', params);
  }

  findMine(params?: Record<string, any>): Observable<PaginatedRoutes> {
    return this.api.get<PaginatedRoutes>('/routes/mine', params);
  }

  findOne(id: number): Observable<Route> {
    return this.api.get<Route>(`/routes/${id}`);
  }

  create(payload: CreateRoutePayload): Observable<Route> {
    return this.api.post<Route>('/routes', payload);
  }

  update(id: number, payload: Partial<CreateRoutePayload>): Observable<Route> {
    return this.api.patch<Route>(`/routes/${id}`, payload);
  }

  remove(id: number): Observable<void> {
    return this.api.delete<void>(`/routes/${id}`);
  }
}