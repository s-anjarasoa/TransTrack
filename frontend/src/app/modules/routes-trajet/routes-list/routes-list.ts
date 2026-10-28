import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../../core/auth/auth';
import { RoutesService } from '../routes-trajet';
import { ConfirmService } from '../../../core/services/confirm';
import { NotificationService } from '../../../core/services/notification';
import { Route, RouteStatut } from '../../../core/models/route.model';

@Component({
  selector: 'app-routes-list',
  standalone: true,
  imports: [RouterLink, FormsModule, MatIconModule, MatTooltipModule],
  templateUrl: './routes-list.html',
  styleUrl: './routes-list.css',
})
export class RoutesList implements OnInit {
  private authService = inject(AuthService);
  private routesService = inject(RoutesService);
  private confirmService = inject(ConfirmService);
  private notification = inject(NotificationService);
  private router = inject(Router);

  readonly RouteStatut = RouteStatut;

  // ✅ Rôles
  isAdmin = this.authService.hasRole('ADMIN');
  isAgent = this.authService.hasRole('AGENT');
  canManage = computed(() => this.isAdmin || this.isAgent);

  // ✅ État
  loading = signal(true);
  allRoutes = signal<Route[]>([]);
  statutFilter = signal<RouteStatut | ''>('');
  searchTerm = signal('');
  actionLoadingId = signal<number | null>(null);

  // ✅ Pagination
  readonly pageSize = 6;
  currentPage = signal(1);

  // ✅ Filtre + recherche
  routes = computed(() => {
    const statut = this.statutFilter();
    const search = this.searchTerm().toLowerCase().trim();

    return this.allRoutes().filter((r) => {
      if (statut && r.statut !== statut) return false;
      if (search) {
        const haystack = `${r.nom ?? ''} ${r.depart} ${r.arrivee}`.toLowerCase();
        if (!haystack.includes(search)) return false;
      }
      return true;
    });
  });

  // ✅ Pagination
  pagedRoutes = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.routes().slice(start, start + this.pageSize);
  });

  totalPages = computed(() =>
    Math.max(1, Math.ceil(this.routes().length / this.pageSize)),
  );

  rangeText = computed(() => {
    const total = this.routes().length;
    if (total === 0) return '0 sur 0';
    const start = (this.currentPage() - 1) * this.pageSize + 1;
    const end = Math.min(this.currentPage() * this.pageSize, total);
    return `${start} – ${end} sur ${total}`;
  });

  // ✅ Statistiques
  stats = computed(() => {
    const list = this.allRoutes();
    return {
      total: list.length,
      actives: list.filter((r) => r.statut === RouteStatut.ACTIVE).length,
      suspendues: list.filter((r) => r.statut === RouteStatut.SUSPENDUE).length,
      inactives: list.filter((r) => r.statut === RouteStatut.INACTIVE).length,
    };
  });

  hasActiveFilters = computed(
    () => !!(this.searchTerm() || this.statutFilter()),
  );

  // ═══════════════════════════════════════════════════════════
  // LIFECYCLE
  // ═══════════════════════════════════════════════════════════
  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.routesService.findMine({ limit: 200 }).subscribe({
      next: (res) => {
        this.allRoutes.set(res.data);
        this.loading.set(false);
        this.currentPage.set(1);
      },
          error: (err) => {
        console.error('❌ Erreur chargement routes:', err);  // ← AJOUTER
        this.notification.error(err.error?.message ?? 'Erreur chargement');
        this.loading.set(false);
      },
    });
  }

  refresh(): void {
    this.load();
  }

  // ═══════════════════════════════════════════════════════════
  // FILTRES
  // ═══════════════════════════════════════════════════════════
  setFilter(statut: RouteStatut | ''): void {
    this.statutFilter.set(statut);
    this.currentPage.set(1);
  }

  onSearch(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
    this.currentPage.set(1);
  }

  clearSearch(): void {
    this.searchTerm.set('');
    this.currentPage.set(1);
  }

  resetFilters(): void {
    this.searchTerm.set('');
    this.statutFilter.set('');
    this.currentPage.set(1);
  }

  // ═══════════════════════════════════════════════════════════
  // PAGINATION
  // ═══════════════════════════════════════════════════════════
  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
  }

  previousPage(): void {
    this.goToPage(this.currentPage() - 1);
  }

  nextPage(): void {
    this.goToPage(this.currentPage() + 1);
  }

  // ═══════════════════════════════════════════════════════════
  // NAVIGATION
  // ═══════════════════════════════════════════════════════════
  goToDetail(route: Route, event: Event): void {
    // ✅ Éviter si clic sur boutons/select/inputs
    const target = event.target as HTMLElement;
    if (target.closest('.route-buttons') || target.closest('select')) return;
    this.router.navigate(['/routes', route.id]);
  }

  // ═══════════════════════════════════════════════════════════
  // ACTIONS
  // ═══════════════════════════════════════════════════════════
  onStatutSelect(route: Route, statut: RouteStatut, event?: Event): void {
    event?.stopPropagation();
    this.actionLoadingId.set(route.id);

    this.routesService.update(route.id, { statut }).subscribe({
      next: (updated) => {
        this.allRoutes.update((list) =>
          list.map((r) => (r.id === updated.id ? updated : r)),
        );
        this.actionLoadingId.set(null);
        this.notification.success(
          `Statut : ${this.statutMeta(statut).label}`,
        );
      },
      error: (err) => {
        this.actionLoadingId.set(null);
        this.notification.error(err.error?.message ?? 'Erreur');
      },
    });
  }

  remove(route: Route, event: Event): void {
    event.stopPropagation();

    this.confirmService
      .ask({
        title: 'Supprimer l\'itinéraire',
        message: `Voulez-vous vraiment supprimer la route "${route.nom || route.depart + ' → ' + route.arrivee}" ?`,
        confirmLabel: 'Supprimer',
        danger: true,
      })
      .pipe(filter(Boolean))
      .subscribe(() => {
        this.actionLoadingId.set(route.id);
        this.routesService.remove(route.id).subscribe({
          next: () => {
            this.allRoutes.update((list) =>
              list.filter((r) => r.id !== route.id),
            );
            this.actionLoadingId.set(null);
            this.notification.success('Itinéraire supprimé');

            // ✅ Si page vide après suppression
            if (this.currentPage() > this.totalPages()) {
              this.currentPage.set(this.totalPages());
            }
          },
          error: (err) => {
            this.actionLoadingId.set(null);
            this.notification.error(
              err.error?.message ?? 'Suppression impossible',
            );
          },
        });
      });
  }

  // ═══════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════
  statutMeta(statut: RouteStatut): {
    label: string;
    cls: string;
    dot: string;
    icon: string;
  } {
    switch (statut) {
      case RouteStatut.ACTIVE:
        return {
          label: 'Active',
          cls: 'chip-success',
          dot: 'dot-success',
          icon: 'check_circle',
        };
      case RouteStatut.INACTIVE:
        return {
          label: 'Inactive',
          cls: 'chip-neutral',
          dot: 'dot-neutral',
          icon: 'pause_circle',
        };
      case RouteStatut.SUSPENDUE:
        return {
          label: 'Suspendue',
          cls: 'chip-danger',
          dot: 'dot-danger',
          icon: 'cancel',
        };
    }
  }

  formatDuree(minutes?: number): string {
    if (!minutes) return '—';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h > 0
      ? `${h}h${m > 0 ? m.toString().padStart(2, '0') : ''}`
      : `${m} min`;
  }

  getMoyenTransIcon(nom?: string): string {
    if (!nom) return 'commute';
    const lower = nom.toLowerCase();
    if (lower.includes('bus')) return 'directions_bus';
    if (lower.includes('train')) return 'train';
    if (lower.includes('avion') || lower.includes('air')) return 'flight';
    if (lower.includes('bateau') || lower.includes('ferry'))
      return 'directions_boat';
    if (lower.includes('taxi')) return 'local_taxi';
    if (lower.includes('camion')) return 'local_shipping';
    return 'commute';
  }

  getRouteTitle(r: Route): string {
    return r.nom || `${r.depart} → ${r.arrivee}`;
  }
}