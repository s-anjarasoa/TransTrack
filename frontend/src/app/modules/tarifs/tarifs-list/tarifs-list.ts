import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/auth/auth';
import { TarifsService } from '../tarifs';
import { RoutesService } from '../../routes-trajet/routes-trajet';   // 👈 ROUTES
import { Tarif, TarifCategorie } from '../../../core/models/tarif.model';
import { filter } from 'rxjs/operators';
import { ConfirmService } from '../../../core/services/confirm';
import { NotificationService } from '../../../core/services/notification';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-tarifs-list',
  standalone: true,
  imports: [RouterLink, FormsModule, MatIconModule, MatTooltipModule],
  templateUrl: './tarifs-list.html',
  styleUrl: './tarifs-list.css',
})
export class TarifsList implements OnInit {
  private authService = inject(AuthService);
  private tarifsService = inject(TarifsService);
  private routesService = inject(RoutesService);   
  private confirmService = inject(ConfirmService);
  private notification = inject(NotificationService);

  isAgent = this.authService.hasRole('AGENT');

  loading = signal(true);
  allTarifs = signal<Tarif[]>([]);
  categorieFilter = signal<TarifCategorie | ''>('');
  actionLoadingId = signal<number | null>(null);

  searchTerm = signal('');
  
  nbRoutes = signal(0);

  readonly pageSize = 4;
  currentPage = signal(1);

  tarifs = computed(() => {
    const cat = this.categorieFilter();
    const term = this.searchTerm().trim().toLowerCase();

    return this.allTarifs().filter((t) => {
      if (cat && t.categorie !== cat) return false;

      if (term) {
        const haystack = [
          t.route?.depart,
          t.route?.arrivee,
          this.categorieLabel(t.categorie),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(term)) return false;
      }

      return true;
    });
  });

  totalPages = computed(() => Math.max(1, Math.ceil(this.tarifs().length / this.pageSize)));

  pagedTarifs = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.tarifs().slice(start, start + this.pageSize);
  });

  pages = computed(() => Array.from({ length: this.totalPages() }, (_, i) => i + 1));

  rangeText = computed(() => {
    const total = this.tarifs().length;
    if (total === 0) return '0 sur 0';
    const start = (this.currentPage() - 1) * this.pageSize + 1;
    const end = Math.min(this.currentPage() * this.pageSize, total);
    return `${start} – ${end} sur ${total}`;
  });

  stats = computed(() => {
    const list = this.allTarifs();
    return {
      total: list.length,
      actifs: list.filter((t) => t.isActif).length,
      enPromo: list.filter((t) => t.prixPromo != null).length,
    };
  });

  categorieOptions = Object.values(TarifCategorie);

  ngOnInit(): void {
    this.load();
    this.loadRoutesCount();
  }

  private load(): void {
    this.loading.set(true);
    this.tarifsService.findAll({ limit: 200 }).subscribe({
      next: (res) => {
        this.allTarifs.set(res.data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  // ✅ Charger le nombre de routes de la société
  private loadRoutesCount(): void {
    this.routesService.findMine({ limit: 1 }).subscribe({
      next: (res) => this.nbRoutes.set(res.total ?? 0),
      error: () => this.nbRoutes.set(0),
    });
  }

  onSearch(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchTerm.set(value);
    this.currentPage.set(1);
  }

  clearSearch(): void {
    this.searchTerm.set('');
    this.currentPage.set(1);
  }

  setFilter(cat: TarifCategorie | ''): void {
    this.categorieFilter.set(cat);
    this.currentPage.set(1);
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
  }

  nextPage(): void {
    this.goToPage(this.currentPage() + 1);
  }

  previousPage(): void {
    this.goToPage(this.currentPage() - 1);
  }

  toggleActif(tarif: Tarif): void {
    this.actionLoadingId.set(tarif.id);
    this.tarifsService.update(tarif.id, { isActif: !tarif.isActif }).subscribe({
      next: (updated) => {
        this.allTarifs.update((list) =>
          list.map((t) => (t.id === updated.id ? updated : t)),
        );
        this.actionLoadingId.set(null);
      },
      error: () => this.actionLoadingId.set(null),
    });
  }

  remove(tarif: Tarif): void {
    this.confirmService
      .ask({
        title: 'Supprimer le tarif',
        message: 'Voulez-vous vraiment supprimer ce tarif ? Cette action est irréversible.',
        confirmLabel: 'Supprimer',
        danger: true,
      })
      .pipe(filter(Boolean))
      .subscribe(() => {
        this.actionLoadingId.set(tarif.id);
        this.tarifsService.remove(tarif.id).subscribe({
          next: () => {
            this.allTarifs.update((list) => list.filter((t) => t.id !== tarif.id));
            this.actionLoadingId.set(null);
            this.notification.success('Tarif supprimé');

            if (this.currentPage() > this.totalPages()) {
              this.currentPage.set(this.totalPages());
            }
          },
          error: (err) => {
            this.actionLoadingId.set(null);
            this.notification.error(err.error?.message ?? 'Suppression impossible');
          },
        });
      });
  }

  categorieLabel(cat: TarifCategorie): string {
    const labels: Record<TarifCategorie, string> = {
      [TarifCategorie.CLASSE]: 'Classe / VIP',
      [TarifCategorie.ECONOMIE]: 'Économie',
    };
    return labels[cat] ?? cat;
  }

  formatAriary(value: number): string {
    return `${value.toLocaleString('fr-FR')} Ar`;
  }
}