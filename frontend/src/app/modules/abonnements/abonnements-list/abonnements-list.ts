import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FormsModule } from '@angular/forms';

import { SubscriptionsService } from '../abonnements';
import { Abonnement, AbonnementType } from '../../../core/models/abonnement.model';

@Component({
  selector: 'app-abonnements-list',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule, MatTooltipModule, FormsModule],
  templateUrl: './abonnements-list.html',
  styleUrl: './abonnements-list.css',
})
export class AbonnementsList implements OnInit {
  private subscriptionsService = inject(SubscriptionsService);

  readonly AbonnementType = AbonnementType;

  loading = signal(true);
  allAbonnements = signal<Abonnement[]>([]);
  
  searchTerm = signal('');
  typeFilter = signal<AbonnementType | ''>('');
  statutFilter = signal<'ACTIF' | 'EXPIRE' | 'ATTENTE' | ''>('');

  stats = computed(() => {
    const list = this.allAbonnements();
    const now = new Date().getTime();
    let actifs = 0, expires = 0, attente = 0;

    list.forEach(a => {
      if (!a.isActif) attente++;
      else if (a.dateFin && new Date(a.dateFin).getTime() < now) expires++;
      else actifs++;
    });

    return { total: list.length, actifs, expires, attente };
  });

  filteredAbonnements = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    const type = this.typeFilter();
    const statut = this.statutFilter();
    const now = new Date().getTime();

    return this.allAbonnements().filter(a => {
      // Recherche sur le nom de la société ou du directeur
      if (term) {
        const sName = a.societe?.name?.toLowerCase() || '';
        const dName = this.getDirecteurName(a).toLowerCase();
        if (!sName.includes(term) && !dName.includes(term)) return false;
      }
      
      if (type && a.type !== type) return false;
      
      if (statut === 'ACTIF' && (!a.isActif || (a.dateFin && new Date(a.dateFin).getTime() < now))) return false;
      if (statut === 'EXPIRE' && (!a.isActif || !a.dateFin || new Date(a.dateFin).getTime() >= now)) return false;
      if (statut === 'ATTENTE' && a.isActif) return false;

      return true;
    });
  });

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.subscriptionsService.findAll({ limit: 200 }).subscribe({
      next: (res) => {
        this.allAbonnements.set(res.data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  getDirecteurName(a: Abonnement): string {
    const u = a.societe?.directeur?.user;
    if (!u) return '—';
    return `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || u.email || '—';
  }

  getTypeLabel(type: AbonnementType): string {
    return type === AbonnementType.MENSUEL ? 'Mensuel' : 'Annuel';
  }

  getStatusLabel(a: Abonnement): { label: string, cls: string } {
    if (!a.isActif) return { label: 'En attente', cls: 'badge-warning' };
    if (a.dateFin && new Date(a.dateFin).getTime() < new Date().getTime()) {
      return { label: 'Expiré', cls: 'badge-danger' };
    }
    return { label: 'Actif', cls: 'badge-success' };
  }

  isExpiringSoon(a: Abonnement): boolean {
    if (!a.isActif || !a.dateFin) return false;
    const diff = new Date(a.dateFin).getTime() - new Date().getTime();
    return diff > 0 && diff <= 7 * 24 * 3600 * 1000;
  }
}