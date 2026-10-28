import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DatePipe, DecimalPipe } from '@angular/common';
import { VoyagesService } from '../voyages';
import { AuthService } from '../../../core/auth/auth';
import { Voyage, VoyageStatut } from '../../../core/models/voyage.model';
import { NotificationService } from '../../../core/services/notification';

@Component({
  selector: 'app-voyages-list',
  standalone: true,
  imports: [
    RouterLink, FormsModule, MatIconModule, MatTooltipModule, DatePipe, DecimalPipe
  ],
  templateUrl: './voyages-list.html',
  styleUrl: './voyages-list.css',
})
export class VoyagesList implements OnInit {
  private voyagesService = inject(VoyagesService);
  private authService = inject(AuthService);
  private notification = inject(NotificationService);

  readonly VoyageStatut = VoyageStatut;
  isAgent = this.authService.hasRole('AGENT');

  loading = signal(true);
  allVoyages = signal<Voyage[]>([]);
  searchTerm = signal('');
  statutFilter = signal<VoyageStatut | ''>('');
  
  // ✅ Filtres date
  dateDebut = signal('');
  dateFin = signal('');

  // ✅ Filtrage combiné (texte + statut + dates)
  voyages = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    const statut = this.statutFilter();
    const debut = this.dateDebut();
    const fin = this.dateFin();
    
    return this.allVoyages().filter(v => {
      if (statut && v.statut !== statut) return false;
      
      if (term) {
        const haystack = `${v.codeVoyage} ${v.route?.depart} ${v.route?.arrivee}`.toLowerCase();
        if (!haystack.includes(term)) return false;
      }

      if (debut || fin) {
        const vDate = new Date(v.dateDepart).getTime();
        if (debut && vDate < new Date(debut).getTime()) return false;
        if (fin && vDate > new Date(fin + 'T23:59:59').getTime()) return false;
      }

      return true;
    });
  });

  stats = computed(() => {
    const list = this.allVoyages();
    return {
      total: list.length,
      planifies: list.filter(v => v.statut === VoyageStatut.PLANIFIE).length,
      enCours: list.filter(v => v.statut === VoyageStatut.EN_COURS).length,
      termines: list.filter(v => v.statut === VoyageStatut.TERMINE).length,
    };
  });

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.voyagesService.findAll({ limit: 100 }).subscribe({
      next: (res) => { this.allVoyages.set(res.data); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  onSearch(event: Event): void { 
    this.searchTerm.set((event.target as HTMLInputElement).value); 
  }

  clearSearch(): void { this.searchTerm.set(''); }

  setFilter(statut: VoyageStatut | ''): void { 
    this.statutFilter.set(statut); 
  }

  // ✅ Méthodes pour les dates
  setDateDebut(event: Event): void {
    this.dateDebut.set((event.target as HTMLInputElement).value);
  }

  setDateFin(event: Event): void {
    this.dateFin.set((event.target as HTMLInputElement).value);
  }

  clearDates(): void {
    this.dateDebut.set('');
    this.dateFin.set('');
  }

  getStatutMeta(statut: VoyageStatut) {
    switch(statut) {
      case VoyageStatut.PLANIFIE: return { label: 'Planifié', cls: 'chip-info', dot: 'dot-info' };
      case VoyageStatut.EN_COURS: return { label: 'En cours', cls: 'chip-active', dot: 'dot-active' };
      case VoyageStatut.TERMINE: return { label: 'Terminé', cls: 'chip-success', dot: 'dot-success' };
      case VoyageStatut.ANNULE: return { label: 'Annulé', cls: 'chip-danger', dot: 'dot-danger' };
      case VoyageStatut.RETARDE: return { label: 'Retardé', cls: 'chip-warning', dot: 'dot-warning' };
      case VoyageStatut.COMPLET: return { label: 'Complet', cls: 'chip-neutral', dot: 'dot-neutral' };
      default: return { label: statut, cls: 'chip-neutral', dot: 'dot-neutral' };
    }
  }
}