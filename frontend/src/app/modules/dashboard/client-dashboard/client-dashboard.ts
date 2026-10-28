import { Component, inject, signal, computed, OnInit, DestroyRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe, DecimalPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { ApiService } from '../../../core/services/api';
import { AuthService } from '../../../core/auth/auth';
import { Reservation, ReservationStatut } from '../../../core/models/reservation.model';

interface Paginated<T> { data: T[]; total: number; }
type ProfileState = 'ok' | 'missing' | 'error';

const ACTIVES = new Set<ReservationStatut>([
  ReservationStatut.EN_ATTENTE,
  ReservationStatut.CONFIRMEE,
  ReservationStatut.PAYEE,
]);

@Component({
  selector: 'app-client-dashboard',
  standalone: true,
  imports: [RouterLink, DatePipe, DecimalPipe, MatIconModule],
  templateUrl: './client-dashboard.html',
  styleUrl: './client-dashboard.css',
})
export class ClientDashboard implements OnInit {
  private api = inject(ApiService);
  private authService = inject(AuthService);
  private destroyRef = inject(DestroyRef);

  partialError = signal(false);
  profileMissing = signal(false);
  today = new Date();

  reservations = signal<Reservation[]>([]);
  totalReservations = signal(0);

  get firstName(): string {
    return this.authService.currentUser?.firstName ?? '';
  }

  // Prochains voyages (triés par date)
  upcoming = computed(() => {
    const now = Date.now();
    return this.reservations()
      .filter((r) => r.voyage && ACTIVES.has(r.statut) && new Date(r.voyage.dateDepart).getTime() > now)
      .sort((a, b) => new Date(a.voyage!.dateDepart).getTime() - new Date(b.voyage!.dateDepart).getTime());
  });

  // Réservations à payer
  aPayer = computed(() => this.reservations().filter((r) => r.statut === ReservationStatut.CONFIRMEE).length);

  // Total dépensé
  totalDepense = computed(() =>
    this.reservations()
      .filter((r) => r.statut === ReservationStatut.PAYEE || r.statut === ReservationStatut.TERMINEE)
      .reduce((sum, r) => sum + Number(r.prixTotal), 0),
  );

  ngOnInit(): void {
    this.load();
  }

  reload(): void {
    this.partialError.set(false);
    this.load();
  }

  private load(): void {
    forkJoin({
      profile: this.api.get<unknown>('/clients/me').pipe(
        map((): ProfileState => 'ok'),
        catchError((err: HttpErrorResponse) => of<ProfileState>(err.status === 404 ? 'missing' : 'error')),
      ),
      reservations: this.api
        .get<Paginated<Reservation>>('/reservations', { limit: 100 })
        .pipe(catchError(() => of(null))),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ profile, reservations }) => {
        this.profileMissing.set(profile === 'missing');
        if (profile === 'error' || (reservations === null && profile === 'ok')) this.partialError.set(true);

        this.reservations.set(reservations?.data ?? []);
        this.totalReservations.set(reservations?.total ?? 0);
      });
  }

  private statutMeta: Partial<Record<ReservationStatut, { label: string; cls: string }>> = {
    [ReservationStatut.EN_ATTENTE]: { label: 'En attente', cls: 'chip-warning' },
    [ReservationStatut.CONFIRMEE]: { label: 'À payer', cls: 'chip-danger' },
    [ReservationStatut.PAYEE]: { label: 'Payée', cls: 'chip-success' },
    [ReservationStatut.ANNULEE]: { label: 'Annulée', cls: 'chip-neutral' },
  };

  statutLabel(s: ReservationStatut): string {
    return this.statutMeta[s]?.label ?? s;
  }

  statutClass(s: ReservationStatut): string {
    return this.statutMeta[s]?.cls ?? 'chip-neutral';
  }
}