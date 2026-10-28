import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CompareResult, LocationLite, PathResult, PreviewResult, RoutingCriteria } from '../../core/models/routing.model';

 

@Injectable({ providedIn: 'root' })
export class RoutingService {
  private http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/routing`;

    findPath(
    startId: number,
    endId: number,
    criteria: RoutingCriteria,
    societeId?: number,   // ← ✅ ajouté
  ): Observable<PathResult> {
    let params = new HttpParams()
      .set('startId', startId)
      .set('endId', endId)
      .set('criteria', criteria);

    if (societeId) {
      params = params.set('societeId', societeId);
    }

    return this.http.get<PathResult>(`${this.base}/shortest-path`, { params });
  }

  compare(
    startId: number,
    endId: number,
    criteria: RoutingCriteria,
  ): Observable<CompareResult> {
    const params = new HttpParams()
      .set('startId', startId)
      .set('endId', endId)
      .set('criteria', criteria);
    return this.http.get<CompareResult>(`${this.base}/compare`, { params });
  }
  // Ajouter dans routing.service.ts
preview(
  startId: number,
  endId: number,
  societeId?: number,
): Observable<PreviewResult> {
  let params = new HttpParams()
    .set('startId', startId)
    .set('endId', endId);
  if (societeId) params = params.set('societeId', societeId);
  return this.http.get<PreviewResult>(`${this.base}/preview`, { params });
}

  /** Autocomplete via l'endpoint existant /locations/search */
  searchLocations(query: string): Observable<LocationLite[]> {
    const params = new HttpParams().set('q', query);
    return this.http.get<LocationLite[]>(
      `${environment.apiUrl}/locations/search`,
      { params },
    );
  }
}