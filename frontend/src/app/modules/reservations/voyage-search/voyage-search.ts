import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';

import { VoyagesService } from '../../voyages/voyages';
import { Voyage } from '../../../core/models/voyage.model';

type SearchFilter = 'ALL' | 'DEPART' | 'ARRIVEE' | 'SOCIETE';

@Component({
  selector: 'app-voyage-search',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  templateUrl: './voyage-search.html',
  styleUrl: './voyage-search.css',
})
export class VoyageSearch implements OnInit, OnDestroy {
  private voyagesService = inject(VoyagesService);
  private router = inject(Router);

  searchTerm = signal('');
  activeFilter = signal<SearchFilter>('ALL');
  dateFrom = signal('');
  dateTo = signal('');
  
  results = signal<Voyage[]>([]);
  loading = signal(false);
  searched = signal(false);
  errorMessage = signal<string | null>(null);

  private debounceTimer: any;

  filters: { value: SearchFilter; label: string; icon: string }[] = [
    { value: 'ALL', label: 'Tout', icon: 'search' },
    { value: 'DEPART', label: 'Départ', icon: 'flight_takeoff' },
    { value: 'ARRIVEE', label: 'Arrivée', icon: 'flight_land' },
    { value: 'SOCIETE', label: 'Société', icon: 'business' },
  ];

  ngOnInit(): void {
    this.search();
  }

  ngOnDestroy(): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
  }

  onSearchInput(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
    this.triggerSearch();
  }

  onDateChange(type: 'from' | 'to', event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    if (type === 'from') this.dateFrom.set(val);
    else this.dateTo.set(val);
    this.triggerSearch();
  }

  setFilter(filter: SearchFilter): void {
    this.activeFilter.set(filter);
    this.search();
  }

  clearSearch(): void {
    this.searchTerm.set('');
    this.triggerSearch();
  }

  resetFilters(): void {
    this.searchTerm.set('');
    this.dateFrom.set('');
    this.dateTo.set('');
    this.activeFilter.set('ALL');
    this.search();
  }

  private triggerSearch(): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => this.search(), 400);
  }

  search(): void {
    this.loading.set(true);
    this.searched.set(true);
    this.errorMessage.set(null);

    const params: Record<string, any> = { limit: 50 };
    
    const term = this.searchTerm().trim();
    if (term) {
      if (this.activeFilter() === 'ALL') params['search'] = term;
      if (this.activeFilter() === 'DEPART') params['depart'] = term;
      if (this.activeFilter() === 'ARRIVEE') params['arrivee'] = term;
      if (this.activeFilter() === 'SOCIETE') params['societe'] = term;
    }

    if (this.dateFrom()) params['fromDate'] = this.dateFrom();
    if (this.dateTo()) params['toDate'] = this.dateTo();

    this.voyagesService.search(params).subscribe({
      next: (res) => {
        const available = res.data.filter(
          (v) => v.statut === 'PLANIFIE' && v.placesDisponibles > 0
        );
        this.results.set(available);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Erreur API', err);
        this.errorMessage.set('Impossible de charger les voyages.');
        this.loading.set(false);
      },
    });
  }

  // ✅ REDIRECTION AVEC LE CONTEXTE IA
  goToReservation(voyage: Voyage, index: number): void {
    // On prépare le contexte avec les 5 premières propositions et leurs scores
    const proposals = this.results().slice(0, 5).map(v => ({
      voyageId: v.id,
      scores: {
        distance: v.route?.distance || 0,
        duration: this.getDureeMinutes(v),
        price: Number(v.prix)
      }
    }));

    this.router.navigate(['/reserver/create'], {
      state: {
        voyage: voyage,
        recommendationContext: {
          proposals: proposals,
          chosenIndex: index
        }
      }
    });
  }

  // ✅ Méthode utilitaire pour la durée
  private getDureeMinutes(v: Voyage): number {
    if (v.dateDepart && v.dateArrivee) {
      return (new Date(v.dateArrivee).getTime() - new Date(v.dateDepart).getTime()) / 60000;
    }
    return v.route?.dureeEstimee || 0;
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleString('fr-FR', {
      weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
    });
  }

  formatAriary(value: number): string {
    return `${Number(value).toLocaleString('fr-FR')} Ar`;
  }
}