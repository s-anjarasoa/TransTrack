import {
  Component, inject, signal, computed,
  OnInit, AfterViewInit, ViewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule, MatPaginatorIntl } from '@angular/material/paginator';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { filter } from 'rxjs/operators';

import { AuthService } from '../../../core/auth/auth';
import { MoyensTransService } from '../moyens-trans';
import { ConfirmService } from '../../../core/services/confirm';
import { NotificationService } from '../../../core/services/notification';
import { MoyenTrans, MoyenTransType } from '../../../core/models/moyen-trans.model';

@Component({
  selector: 'app-moyens-trans-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    FormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatIconModule,
    MatTooltipModule,
  ],
  templateUrl: './moyens-trans-list.html',
  styleUrl: './moyens-trans-list.css',
  providers: [
    {
      provide: MatPaginatorIntl,
      useFactory: () => Object.assign(new MatPaginatorIntl(), {
        itemsPerPageLabel: 'Éléments par page :',
      }),
    },
  ],
})
export class MoyensTransList implements OnInit, AfterViewInit {
  private authService = inject(AuthService);
  private confirmService = inject(ConfirmService);
  private notification = inject(NotificationService);
  private moyensTransService = inject(MoyensTransService);

  isAgent = this.authService.hasRole('AGENT');

  loading = signal(true);
  total = signal(0);
  actionLoadingId = signal<number | null>(null);

  displayedColumns: string[] = ['nom', 'type', 'statut', 'actions'];
  dataSource = new MatTableDataSource<MoyenTrans>([]);

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  // ✅ Données brutes (toutes les lignes reçues du backend)
  allData = signal<MoyenTrans[]>([]);

  // Recherche
  searchTerm = signal('');

  // Filtres
  typeFilter = signal<MoyenTransType | ''>('');
  statutFilter = signal<'all' | 'actif' | 'inactif'>('all');
  dateDebutFilter = signal<string>('');
  dateFinFilter = signal<string>('');

  // Statistiques
  stats = signal<{
    total: number;
    actifs: number;
    inactifs: number;
    parType: number;
  }>({
    total: 0,
    actifs: 0,
    inactifs: 0,
    parType: 0,
  });

  typeOptions = Object.values(MoyenTransType);

  typeIcons: Record<MoyenTransType, string> = {
    [MoyenTransType.BUS]: 'directions_bus',
    [MoyenTransType.TRAIN]: 'train',
    [MoyenTransType.BATEAU]: 'directions_boat',
    [MoyenTransType.AVION]: 'flight',
    [MoyenTransType.TAXI]: 'local_taxi',
    [MoyenTransType.TAXI_BROUSSE]: 'airport_shuttle',
    [MoyenTransType.FERRY]: 'directions_boat',
    [MoyenTransType.CAMION]: 'local_shipping',
  };

  typeColors: Record<MoyenTransType, string> = {
    [MoyenTransType.BUS]: 'blue',
    [MoyenTransType.TRAIN]: 'purple',
    [MoyenTransType.BATEAU]: 'cyan',
    [MoyenTransType.AVION]: 'indigo',
    [MoyenTransType.TAXI]: 'amber',
    [MoyenTransType.TAXI_BROUSSE]: 'orange',
    [MoyenTransType.FERRY]: 'teal',
    [MoyenTransType.CAMION]: 'rose',
  };

  hasActiveFilters = computed(() => {
    return !!(this.searchTerm()
      || this.typeFilter()
      || this.statutFilter() !== 'all'
      || this.dateDebutFilter()
      || this.dateFinFilter());
  });

  ngOnInit(): void {
    this.load();
  }

  ngAfterViewInit(): void {
    // ✅ Le paginator est TOUJOURS dans le DOM (overlay)
    // Donc @ViewChild le trouve ici et on peut le lier immédiatement
    this.dataSource.paginator = this.paginator;
  }

  // ============================================================
  // CHARGEMENT
  // ============================================================
  private load(): void {
    this.loading.set(true);
    this.moyensTransService.findAll({ limit: 100 }).subscribe({
      next: (res) => {
        this.allData.set(res.data);
        this.total.set(res.total);
        this.updateStats(res.data);
        this.loading.set(false);
        // ✅ Après le rendu, appliquer les filtres et reset à la page 1
        setTimeout(() => this.applyFilters());
      },
      error: () => this.loading.set(false),
    });
  }

  refresh(): void {
    this.load();
  }

  private updateStats(data: MoyenTrans[]): void {
    const types = new Set(data.map((d) => d.type));
    this.stats.set({
      total: data.length,
      actifs: data.filter((d) => d.isActif).length,
      inactifs: data.filter((d) => !d.isActif).length,
      parType: types.size,
    });
  }

  // ============================================================
  // FILTRAGE
  // ============================================================
  private applyFilters(): void {
    const search = this.searchTerm().trim().toLowerCase();
    const type = this.typeFilter();
    const statut = this.statutFilter();
    const debut = this.dateDebutFilter();
    const fin = this.dateFinFilter();

    const dateDebut = debut ? new Date(debut + 'T00:00:00') : null;
    const dateFin = fin ? new Date(fin + 'T23:59:59') : null;

    const filtered = this.allData().filter((item) => {
      if (type && item.type !== type) return false;
      if (statut === 'actif' && !item.isActif) return false;
      if (statut === 'inactif' && item.isActif) return false;

      if (search) {
        const haystack = `${item.nom} ${item.description ?? ''}`.toLowerCase();
        if (!haystack.includes(search)) return false;
      }

      if (dateDebut || dateFin) {
        const created = item.createdAt ? new Date(item.createdAt) : null;
        if (!created) return false;
        if (dateDebut && created < dateDebut) return false;
        if (dateFin && created > dateFin) return false;
      }

      return true;
    });

    this.dataSource.data = filtered;

    // ✅ Reset pagination
    if (this.paginator) {
      this.paginator.length = filtered.length;
      this.paginator.pageIndex = 0;
    }
  }

  // ============================================================
  // RECHERCHE
  // ============================================================
  onSearch(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
    this.applyFilters();
  }

  clearSearch(): void {
    this.searchTerm.set('');
    this.applyFilters();
  }

  // ============================================================
  // FILTRES
  // ============================================================
  setTypeFilter(type: MoyenTransType | ''): void {
    this.typeFilter.set(type);
    this.applyFilters();
  }

  setStatutFilter(statut: 'all' | 'actif' | 'inactif'): void {
    this.statutFilter.set(statut);
    this.applyFilters();
  }

  setDateDebut(event: Event): void {
    this.dateDebutFilter.set((event.target as HTMLInputElement).value);
    this.applyFilters();
  }

  setDateFin(event: Event): void {
    this.dateFinFilter.set((event.target as HTMLInputElement).value);
    this.applyFilters();
  }

  clearDates(): void {
    this.dateDebutFilter.set('');
    this.dateFinFilter.set('');
    this.applyFilters();
  }

  resetFilters(): void {
    this.typeFilter.set('');
    this.statutFilter.set('all');
    this.searchTerm.set('');
    this.dateDebutFilter.set('');
    this.dateFinFilter.set('');
    this.applyFilters();
  }

  // ============================================================
  // ACTIONS
  // ============================================================
  toggleActif(item: MoyenTrans): void {
    this.actionLoadingId.set(item.id);
    this.moyensTransService.update(item.id, { isActif: !item.isActif }).subscribe({
      next: (updated) => {
        this.allData.update((list) =>
          list.map((i) => (i.id === updated.id ? updated : i)),
        );
        this.updateStats(this.allData());
        this.actionLoadingId.set(null);
        this.applyFilters();
        this.notification.success(
          updated.isActif ? 'Moyen de transport activé' : 'Moyen de transport désactivé',
        );
      },
      error: () => this.actionLoadingId.set(null),
    });
  }

  remove(item: MoyenTrans): void {
    this.confirmService
      .ask({
        title: 'Supprimer le moyen de transport',
        message: `Voulez-vous vraiment supprimer "${item.nom}" ? Cette action est irréversible.`,
        confirmLabel: 'Supprimer',
        danger: true,
      })
      .pipe(filter(Boolean))
      .subscribe(() => {
        this.actionLoadingId.set(item.id);
        this.moyensTransService.remove(item.id).subscribe({
          next: () => {
            this.allData.update((list) => list.filter((i) => i.id !== item.id));
            this.total.update((t) => t - 1);
            this.updateStats(this.allData());
            this.actionLoadingId.set(null);
            this.applyFilters();
            this.notification.success('Moyen de transport supprimé');
          },
          error: (err) => {
            this.actionLoadingId.set(null);
            this.notification.error(err.error?.message ?? 'Suppression impossible');
          },
        });
      });
  }

  // ============================================================
  // HELPERS
  // ============================================================
  typeLabel(type: MoyenTransType): string {
    const labels: Record<MoyenTransType, string> = {
      [MoyenTransType.BUS]: 'Bus',
      [MoyenTransType.TRAIN]: 'Train',
      [MoyenTransType.BATEAU]: 'Bateau',
      [MoyenTransType.AVION]: 'Avion',
      [MoyenTransType.TAXI]: 'Taxi',
      [MoyenTransType.TAXI_BROUSSE]: 'Taxi-brousse',
      [MoyenTransType.FERRY]: 'Ferry',
      [MoyenTransType.CAMION]: 'Camion',
    };
    return labels[type] ?? type;
  }

  getIcon(type: MoyenTransType): string {
    return this.typeIcons[type] ?? 'commute';
  }

  getColor(type: MoyenTransType): string {
    return this.typeColors[type] ?? 'blue';
  }
}