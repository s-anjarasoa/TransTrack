import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../core/services/api';
import { Billet } from '../../core/models/billet.model';


@Injectable({ providedIn: 'root' })
export class BilletsService {
  private api = inject(ApiService);

  getByReservation(reservationId: number): Observable<Billet[]> {
    return this.api.get<Billet[]>(`/billets/reservation/${reservationId}`);
  }

  envoyerParEmail(id: number): Observable<void> {
    return this.api.post<void>(`/billets/${id}/envoyer-email`, {});
  }

  // ✅ AJOUT DE LA MÉTHODE DE VALIDATION PAR SCAN
  valider(qrCode: string): Observable<any> {
    return this.api.patch<any>(`/billets/scan/${qrCode}`, {});
  }
}