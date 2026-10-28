import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { filter } from 'rxjs/operators';
// ✅ Import de la librairie (format ESM recommandé)
import { colornames } from 'color-name-list';

import { AuthService } from '../../../core/auth/auth';
import { VehiculesService } from '../vehicules';
import { Vehicule, VehiculeStatut } from '../../../core/models/vehicule.model';
import { ConfirmService } from '../../../core/services/confirm';
import { NotificationService } from '../../../core/services/notification';

@Component({
  selector: 'app-vehicules-list',
  standalone: true,
  imports: [RouterLink, FormsModule, MatIconModule],
  templateUrl: './vehicules-list.html',
  styleUrl: './vehicules-list.css',
})
export class VehiculesList implements OnInit {
  private authService = inject(AuthService);
  private vehiculesService = inject(VehiculesService);
  private confirmService = inject(ConfirmService);
  private notification = inject(NotificationService);

  readonly VehiculeStatut = VehiculeStatut;
  isAgent = this.authService.hasRole('AGENT');

  loading = signal(true);
  allVehicules = signal<Vehicule[]>([]);
  statutFilter = signal<VehiculeStatut | ''>('');
  searchTerm = signal('');
  actionLoadingId = signal<number | null>(null);

  readonly pageSize = 6;
  currentPage = signal(1);

  vehicules = computed(() => {
    const statut = this.statutFilter();
    const search = this.searchTerm().toLowerCase().trim();
    return this.allVehicules().filter((v) => {
      if (statut && v.statut !== statut) return false;
      if (search) {
        const haystack =
          `${v.immatriculation} ${v.marque} ${v.modele}`.toLowerCase();
        if (!haystack.includes(search)) return false;
      }
      return true;
    });
  });

  pagedVehicules = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.vehicules().slice(start, start + this.pageSize);
  });

  totalPages = computed(() =>
    Math.max(1, Math.ceil(this.vehicules().length / this.pageSize)),
  );

  rangeText = computed(() => {
    const total = this.vehicules().length;
    if (total === 0) return '0 sur 0';
    const start = (this.currentPage() - 1) * this.pageSize + 1;
    const end = Math.min(this.currentPage() * this.pageSize, total);
    return `${start} – ${end} sur ${total}`;
  });

  stats = computed(() => {
    const list = this.allVehicules();
    return {
      total: list.length,
      disponible: list.filter((v) => v.statut === VehiculeStatut.DISPONIBLE).length,
      enService: list.filter((v) => v.statut === VehiculeStatut.EN_SERVICE).length,
      maintenance: list.filter((v) => v.statut === VehiculeStatut.EN_MAINTENANCE).length,
    };
  });

  hasActiveFilters = computed(
    () => !!(this.searchTerm() || this.statutFilter()),
  );

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.vehiculesService.findAll({ limit: 200 }).subscribe({
      next: (res) => {
        this.allVehicules.set(res.data);
        this.loading.set(false);
        this.currentPage.set(1);
      },
      error: () => this.loading.set(false),
    });
  }

  refresh(): void {
    this.load();
  }

  setFilter(statut: VehiculeStatut | ''): void {
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

  onStatutSelect(vehicule: Vehicule, statut: VehiculeStatut): void {
    this.actionLoadingId.set(vehicule.id);
    this.vehiculesService.update(vehicule.id, { statut }).subscribe({
      next: (updated) => {
        this.allVehicules.update((list) =>
          list.map((v) => (v.id === updated.id ? updated : v)),
        );
        this.actionLoadingId.set(null);
        this.notification.success('Statut mis à jour');
      },
      error: (err) => {
        this.actionLoadingId.set(null);
        this.notification.error(
          err.error?.message ?? 'Modification impossible',
        );
      },
    });
  }

  remove(vehicule: Vehicule, event: Event): void {
    event.stopPropagation();
    this.confirmService
      .ask({
        title: 'Supprimer le véhicule',
        message: `Voulez-vous vraiment supprimer ${vehicule.immatriculation} ? Cette action est irréversible.`,
        confirmLabel: 'Supprimer',
        danger: true,
      })
      .pipe(filter(Boolean))
      .subscribe(() => {
        this.actionLoadingId.set(vehicule.id);
        this.vehiculesService.remove(vehicule.id).subscribe({
          next: () => {
            this.allVehicules.update((list) =>
              list.filter((v) => v.id !== vehicule.id),
            );
            this.actionLoadingId.set(null);
            this.notification.success('Véhicule supprimé');
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

  /**
   * ✅ Trouve le code hex à partir du nom de la couleur.
   * Utilise color-name-list pour reconnaître la couleur.
   * Retourne null si non reconnue.
   */
  getCouleurHex(couleur?: string): string | null {
    if (!couleur) return null;

    const c = couleur.trim().toLowerCase();

    // ✅ Si c'est déjà un HEX, on le prend directement
    if (/^#[0-9A-Fa-f]{6}$/.test(c)) return c;

    // ✅ Cherche une correspondance exacte dans la librairie
    const exactMatch = colornames.find(
      (item) => item.name.toLowerCase() === c
    );
    if (exactMatch) return exactMatch.hex;

    // ✅ Cherche une correspondance partielle (ex: "rouge foncé" -> "rouge")
    const partialMatch = colornames.find(
      (item) => c.includes(item.name.toLowerCase()) || item.name.toLowerCase().includes(c)
    );
    if (partialMatch) return partialMatch.hex;

    return null;
  }

  /**
   * ✅ Détermine si une couleur est claire pour ajuster la lisibilité du texte.
   * Utilise la luminance perçue.
   */
  isCouleurClaire(couleur?: string): boolean {
    const hex = this.getCouleurHex(couleur);
    if (!hex) return true;

    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.7;
  }

  statutMeta(statut: VehiculeStatut): {
    label: string;
    cls: string;
    dot: string;
  } {
    switch (statut) {
      case VehiculeStatut.DISPONIBLE:
        return { label: 'Disponible', cls: 'chip-success', dot: 'dot-success' };
      case VehiculeStatut.EN_SERVICE:
        return { label: 'En service', cls: 'chip-info', dot: 'dot-info' };
      case VehiculeStatut.EN_MAINTENANCE:
        return { label: 'Maintenance', cls: 'chip-warning', dot: 'dot-warning' };
      case VehiculeStatut.HORS_SERVICE:
        return { label: 'Hors service', cls: 'chip-danger', dot: 'dot-danger' };
    }
  }
}