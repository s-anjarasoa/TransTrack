import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { from, isObservable } from 'rxjs';
import { filter } from 'rxjs/operators';

import { AuthService } from '../../../core/auth/auth';
import { AgentProfileService } from '../../../core/services/agent-profile';
import { SocietesService } from '../societes';
import { Societe, SocieteStatut } from '../../../core/models/societe.model';
import { AgentTypeLabelPipe } from '../../../shared/pipes/agent-type-label-pipe';
import { ConfirmService } from '../../../core/services/confirm';
import { NotificationService } from '../../../core/services/notification';
import { MatIconModule } from '@angular/material/icon'; // ✅ Import ajouté

@Component({
  selector: 'app-societes-list',
  standalone: true,
  imports: [
    RouterLink, 
    AgentTypeLabelPipe, 
    MatIconModule // ✅ Ajouté
  ],
  templateUrl: './societes-list.html',
  styleUrl: './societes-list.css',
})
export class SocietesList implements OnInit {
  private authService = inject(AuthService);
  isAdmin = this.authService.hasRole('ADMIN');

  private agentProfileService = inject(AgentProfileService);
  private societesService = inject(SocietesService);
  private router = inject(Router);
  private confirmService = inject(ConfirmService);
  private notification = inject(NotificationService);
  
  readonly SocieteStatut = SocieteStatut;

  loading = signal(true);
  allSocietes = signal<Societe[]>([]);
  total = signal(0);
  actionLoadingId = signal<number | null>(null);

  // ✅ Filtres
  statutFilter = signal<SocieteStatut | ''>('');
  searchTerm = signal('');

  // ✅ KPI (Calculés automatiquement)
  stats = computed(() => {
    const list = this.allSocietes();
    return {
      total: list.length,
      validees: list.filter((s) => s.statut === SocieteStatut.VALIDEE).length,
      enAttente: list.filter((s) => s.statut === SocieteStatut.EN_ATTENTE).length,
      rejetees: list.filter((s) => s.statut === SocieteStatut.REJETEE).length,
    };
  });

  // ✅ Filtrage combiné (Statut + Recherche)
  societes = computed(() => {
    const filter = this.statutFilter();
    const term = this.searchTerm().toLowerCase().trim();
    const list = this.allSocietes();

    return list.filter((s) => {
      // 1. Filtre Statut
      if (filter && s.statut !== filter) return false;
      
      // 2. Filtre Recherche
      if (term) {
        const haystack = `${s.name} ${s.nif} ${s.email} ${s.phone}`.toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      
      return true;
    });
  });

  ngOnInit(): void {
    if (this.isAdmin) {
      this.loadAll();
    } else {
      const loaded$ = isObservable(this.agentProfileService.ensureLoaded())
        ? this.agentProfileService.ensureLoaded()
        : from(this.agentProfileService.ensureLoaded());

      loaded$.subscribe((agent) => {
        if (agent?.societeId) {
          this.router.navigate(['/societes', agent.societeId]);
        } else {
          this.router.navigate(['/societes/new']);
        }
      });
    }
  }

  loadAll(): void {
    this.loading.set(true);
    this.societesService.findAll({ limit: 100 }).subscribe({
      next: (res) => {
        this.allSocietes.set(res.data);
        this.total.set(res.total);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  // ✅ Méthodes de recherche
  onSearch(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
  }

  clearSearch(): void {
    this.searchTerm.set('');
  }

  onFilterChange(statut: SocieteStatut | ''): void {
    this.statutFilter.set(statut);
  }

  directeurName(societe: Societe): string {
    const u = societe.directeur?.user;
    return u ? `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || u.email || '—' : '—';
  }

  validateInline(societe: Societe, event: Event): void {
    event.stopPropagation();
    this.act(societe, SocieteStatut.VALIDEE);
  }

  rejectInline(societe: Societe, event: Event): void {
    event.stopPropagation();
    this.act(societe, SocieteStatut.REJETEE);
  }

  // ✅ Nouvelle méthode de suppression réservée aux administrateurs
  deleteInline(societe: Societe, event: Event): void {
  event.stopPropagation();
  if (!this.isAdmin) return;

  this.confirmService
    .ask({
      title: 'Supprimer la société',
      message: `Êtes-vous sûr de vouloir supprimer la société "${societe.name}" ?`,
      confirmLabel: 'Supprimer',
      danger: true,
    })
    .pipe(filter(Boolean))
    .subscribe(() => {
      this.actionLoadingId.set(societe.id);
      this.societesService.delete(societe.id).subscribe({
        next: () => {
          this.allSocietes.update((list) => list.filter((s) => s.id !== societe.id));
          this.total.update((t) => Math.max(0, t - 1));
          this.actionLoadingId.set(null);
          this.notification.success('Société supprimée');
        },
        error: (err) => {
          this.actionLoadingId.set(null);
          this.notification.error(err.error?.message ?? 'Suppression impossible');
        },
      });
    });
  }

  private act(societe: Societe, statut: SocieteStatut.VALIDEE | SocieteStatut.REJETEE): void {
    this.actionLoadingId.set(societe.id);
    this.societesService.validate(societe.id, { statut }).subscribe({
      next: (updated) => {
        this.allSocietes.update((list) => list.map((s) => (s.id === updated.id ? updated : s)));
        this.actionLoadingId.set(null);
      },
      error: () => this.actionLoadingId.set(null),
    });
  }

  getStatusLabel(statut: SocieteStatut): string {
    const labels: Record<SocieteStatut, string> = {
      [SocieteStatut.EN_ATTENTE]: 'En attente',
      [SocieteStatut.VALIDEE]: 'Validée',
      [SocieteStatut.REJETEE]: 'Rejetée',
      [SocieteStatut.SUSPENDUE]: 'Suspendue',
    };
    return labels[statut] || statut;
  }

  getCountByStatut(statut: SocieteStatut): number {
    return this.allSocietes().filter((s) => s.statut === statut).length;
  }

  statusBadgeClass(statut: SocieteStatut): string {
    switch (statut) {
      case SocieteStatut.VALIDEE: return 'badge-success';
      case SocieteStatut.EN_ATTENTE: return 'badge-warning';
      case SocieteStatut.REJETEE: return 'badge-danger';
      default: return 'badge-neutral';
    }
  }
}