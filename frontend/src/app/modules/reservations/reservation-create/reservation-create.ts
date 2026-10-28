import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';

import { ReservationsService } from '../reservations';
import { Voyage } from '../../../core/models/voyage.model';

@Component({
  selector: 'app-reservation-create',
  standalone: true,
  imports: [CommonModule, MatIconModule, FormsModule],
  templateUrl: './reservation-create.html',
  styleUrl: './reservation-create.css'
})
export class ReservationCreate implements OnInit {
  private router = inject(Router);
  private reservationsService = inject(ReservationsService);

  voyage = signal<Voyage | null>(null);
  
  // ✅ IA : Contexte de recommandation
  recommendationContext = signal<any>(null);

  // ✅ Signaux pour la gestion des places et sièges
  nombrePlaces = signal(1);
  siegesSelectionnes = signal<string[]>([]);
  categorie = signal<'CLASSE' | 'ECONOMIE' | null>(null);
  
  loading = signal(false);
  errorMessage = signal<string | null>(null);

  // ✅ Capacité selon la catégorie
  capaciteMax = computed(() => {
    const v = this.voyage();
    if (!v) return 0;
    if (this.categorie() === 'CLASSE') return v.placesClasseDisponibles ?? 0;
    if (this.categorie() === 'ECONOMIE') return v.placesEconomieDisponibles ?? 0;
    return v.placesDisponibles;
  });

  // ✅ Génération des sièges disponibles
  siegesDisponibles = computed(() => {
    const total = this.capaciteMax();
    return Array.from({ length: total }, (_, i) => (i + 1).toString().padStart(2, '0'));
  });

  ngOnInit(): void {
    const state = history.state;
    if (state && state.voyage) {
      const v = state.voyage as Voyage;
      this.voyage.set(v);
      
      // ✅ Récupération du contexte IA
      if (state.recommendationContext) {
        this.recommendationContext.set(state.recommendationContext);
      }
      
      if (!this.isBus) {
        if ((v.placesEconomieDisponibles ?? 0) > 0) {
          this.categorie.set('ECONOMIE');
        } else if ((v.placesClasseDisponibles ?? 0) > 0) {
          this.categorie.set('CLASSE');
        }
      }
    } else {
      this.router.navigate(['/reservations/search']);
    }
  }

  get isBus(): boolean {
    const v = this.voyage();
    return !!v && (!v.prixClasse || !v.prixEconomie);
  }

  get prixUnitaire(): number {
    const v = this.voyage();
    if (!v) return 0;
    if (this.categorie() === 'CLASSE') return v.prixClasse ?? v.prix;
    if (this.categorie() === 'ECONOMIE') return v.prixEconomie ?? v.prix;
    return v.prix;
  }

  get prixTotal(): number {
    return this.prixUnitaire * this.nombrePlaces();
  }

  incrementPlaces(): void {
    if (this.nombrePlaces() < this.capaciteMax()) {
      this.nombrePlaces.update(n => n + 1);
    }
  }

  decrementPlaces(): void {
    if (this.nombrePlaces() > 1) {
      this.nombrePlaces.update(n => n - 1);
      if (this.siegesSelectionnes().length > this.nombrePlaces()) {
        this.siegesSelectionnes.update(s => s.slice(0, this.nombrePlaces()));
      }
    }
  }

  toggleSiege(siege: string): void {
    const selection = this.siegesSelectionnes();
    if (selection.includes(siege)) {
      this.siegesSelectionnes.set(selection.filter(s => s !== siege));
    } else {
      if (selection.length < this.nombrePlaces()) {
        this.siegesSelectionnes.set([...selection, siege]);
      }
    }
  }

  setCategorie(cat: 'CLASSE' | 'ECONOMIE'): void {
    this.categorie.set(cat);
    this.nombrePlaces.set(1);
    this.siegesSelectionnes.set([]);
  }

  submit(): void {
    const v = this.voyage();
    if (!v) return;

    if (this.siegesSelectionnes().length !== this.nombrePlaces()) {
      this.errorMessage.set(`Veuillez sélectionner exactement ${this.nombrePlaces()} siège(s).`);
      return;
    }

    const payload: any = {
      voyageId: v.id,
      nombrePlaces: this.nombrePlaces(),
      sieges: this.siegesSelectionnes(),
    };

    if (!this.isBus) {
      if (!this.categorie()) {
        this.errorMessage.set('Veuillez sélectionner une catégorie.');
        return;
      }
      payload.categorie = this.categorie();
    }

    // ✅ AJOUT DU CONTEXTE IA AU PAYLOAD
    if (this.recommendationContext()) {
      payload.recommendationContext = this.recommendationContext();
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    this.reservationsService.create(payload).subscribe({
      next: (res) => {
        this.loading.set(false);
        if (res && res.id) {
          this.router.navigate(['/reservations', res.id]);
        } else {
          this.router.navigate(['/reservations']);
        }
      },
      error: (err) => {
        this.loading.set(false);
        let msg = 'Erreur lors de la réservation.';
        if (err.error) {
          if (Array.isArray(err.error.message)) msg = err.error.message.join(', ');
          else if (err.error.message) msg = err.error.message;
        }
        this.errorMessage.set(msg);
      }
    });
  }

  cancel(): void {
    this.router.navigate(['/reservations/search']);
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