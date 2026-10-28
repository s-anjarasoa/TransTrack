import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

import { AuthService } from '../../../core/auth/auth';
import { ReservationsService } from '../reservations';
import { Reservation, ReservationStatut } from '../../../core/models/reservation.model';

type SortOption = 'date_desc' | 'date_asc' | 'price_desc' | 'price_asc';

@Component({
  selector: 'app-reservations-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, MatIconModule],
  templateUrl: './reservations-list.html',
  styleUrl: './reservations-list.css',
})
export class ReservationsList implements OnInit {
  private authService = inject(AuthService);
  private reservationsService = inject(ReservationsService);

  readonly ReservationStatut = ReservationStatut;

  /** ✅ Bouton "Nouvelle réservation" masqué pour tous (à réactiver plus tard en passant à `true`) */
  readonly showAddButton = false;

  isClient = this.authService.hasRole('CLIENT');
  isAgent = this.authService.hasRole('AGENT');

  // ─── Signaux de données ───
  allReservations = signal<Reservation[]>([]);
  actionLoadingId = signal<number | null>(null);
  loading = signal(true);

  // ─── Signaux de filtres ───
  statutFilter = signal<ReservationStatut | ''>('');
  searchTerm = signal('');
  dateFrom = signal<string>('');
  dateTo = signal<string>('');
  sortBy = signal<SortOption>('date_desc');

  // ─── Compteurs par statut (chips) ───
  statusCounts = computed(() => {
    const list = this.allReservations();
    return {
      all: list.length,
      enAttente: list.filter(r => r.statut === ReservationStatut.EN_ATTENTE).length,
      confirmee: list.filter(r => r.statut === ReservationStatut.CONFIRMEE).length,
      payee: list.filter(r => r.statut === ReservationStatut.PAYEE).length,
      annulee: list.filter(r => r.statut === ReservationStatut.ANNULEE).length,
    };
  });

  totalCount = computed(() => this.allReservations().length);

  hasActiveFilters = computed(() =>
    !!this.searchTerm() || !!this.dateFrom() || !!this.dateTo() || !!this.statutFilter()
  );

  // ─── Filtrage + tri combinés ───
  filteredReservations = computed(() => {
    let list = [...this.allReservations()];
    const statut = this.statutFilter();
    const search = this.searchTerm().toLowerCase().trim();
    const from = this.dateFrom() ? new Date(this.dateFrom()).getTime() : null;
    const to = this.dateTo() ? new Date(this.dateTo()).getTime() + 86400000 : null;

    if (statut) list = list.filter((r) => r.statut === statut);
    if (from !== null) list = list.filter((r) => new Date(r.dateReservation).getTime() >= from);
    if (to !== null) list = list.filter((r) => new Date(r.dateReservation).getTime() <= to);

    if (search) {
      list = list.filter((r) => {
        const route = `${r.voyage?.route?.depart || ''} ${r.voyage?.route?.arrivee || ''}`.toLowerCase();
        const code = r.codeReservation.toLowerCase();
        const client = this.isAgent
          ? `${r.client?.user?.firstName || ''} ${r.client?.user?.lastName || ''}`.toLowerCase()
          : '';
        return route.includes(search) || code.includes(search) || client.includes(search);
      });
    }

    // Tri
    const sort = this.sortBy();
    list.sort((a, b) => {
      switch (sort) {
        case 'date_asc':   return new Date(a.dateReservation).getTime() - new Date(b.dateReservation).getTime();
        case 'price_desc': return b.prixTotal - a.prixTotal;
        case 'price_asc':  return a.prixTotal - b.prixTotal;
        default:           return new Date(b.dateReservation).getTime() - new Date(a.dateReservation).getTime();
      }
    });
    return list;
  });

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.reservationsService.findAll({ limit: 100 }).subscribe({
      next: (res) => {
        this.allReservations.set(res.data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  setFilter(statut: ReservationStatut | ''): void {
    this.statutFilter.set(statut);
  }

  onSearch(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
  }
  onDateFromChange(event: Event): void {
    this.dateFrom.set((event.target as HTMLInputElement).value);
  }
  onDateToChange(event: Event): void {
    this.dateTo.set((event.target as HTMLInputElement).value);
  }
  onSortChange(event: Event): void {
    this.sortBy.set((event.target as HTMLSelectElement).value as SortOption);
  }

  resetFilters(): void {
    this.statutFilter.set('');
    this.searchTerm.set('');
    this.dateFrom.set('');
    this.dateTo.set('');
  }

  confirmer(reservation: Reservation, event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    this.actionLoadingId.set(reservation.id);
    this.reservationsService.confirm(reservation.id).subscribe({
      next: (updated) => {
        this.allReservations.update((list) => list.map((r) => (r.id === updated.id ? updated : r)));
        this.actionLoadingId.set(null);
      },
      error: () => this.actionLoadingId.set(null),
    });
  }

  statutMeta(statut: ReservationStatut): { label: string; cls: string } {
    switch (statut) {
      case ReservationStatut.EN_ATTENTE: return { label: 'En attente', cls: 'chip-warning' };
      case ReservationStatut.CONFIRMEE:  return { label: 'Confirmée', cls: 'chip-info' };
      case ReservationStatut.PAYEE:      return { label: 'Payée', cls: 'chip-success' };
      case ReservationStatut.ANNULEE:    return { label: 'Annulée', cls: 'chip-danger' };
      case ReservationStatut.REMBOURSEE: return { label: 'Remboursée', cls: 'chip-neutral' };
      case ReservationStatut.TERMINEE:   return { label: 'Terminée', cls: 'chip-neutral' };
    }
  }

  formatAriary(value: number): string {
    return `${Number(value).toLocaleString('fr-FR')} Ar`;
  }
}