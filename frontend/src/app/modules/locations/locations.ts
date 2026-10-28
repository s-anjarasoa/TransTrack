import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../core/services/api';
import { Location, PaginatedLocations } from '../../core/models/location.model';

@Injectable({ providedIn: 'root' })
export class LocationsService {
  private api = inject(ApiService);

  findAll(params?: Record<string, any>): Observable<PaginatedLocations> {
    return this.api.get<PaginatedLocations>('/locations', params);
  }

  findOne(id: number): Observable<Location> {
    return this.api.get<Location>(`/locations/${id}`);
  }

  create(payload: Partial<Location>): Observable<Location> {
    return this.api.post<Location>('/locations', payload);
  }

  update(id: number, payload: Partial<Location>): Observable<Location> {
    return this.api.patch<Location>(`/locations/${id}`, payload);
  }

  remove(id: number): Observable<void> {
    return this.api.delete<void>(`/locations/${id}`);
  }

  getProvinces(): Observable<string[]> {
    return this.api.get<string[]>('/locations/provinces');
  }
  geocode(query: string): Observable<{ lat: number; lng: number; displayName: string } | null> {
    return this.api.get<{ lat: number; lng: number; displayName: string } | null>( '/locations/geocode',{ q: query },);
  }
  getProvinceInfo(name: string): Observable<{name: string; center: [number, number]; zoom: number; regions: string[];  }> {
    return this.api.get(`/locations/province/${encodeURIComponent(name)}`);
  }

  reverseGeocode(lat: number, lng: number): Observable<{displayName: string;road?: string;suburb?: string;
   city?: string; county?: string;  state?: string; country?: string;} | null> {
    return this.api.get<any>('/locations/reverse', { lat, lng });
  }
  search(q: string, limit = 10): Observable<Location[]> {
  return this.api.get<Location[]>('/locations/search', { q, limit });
  }

}