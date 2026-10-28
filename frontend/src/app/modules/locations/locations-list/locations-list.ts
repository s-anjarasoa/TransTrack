import {
  Component, inject, signal, computed, OnInit,
  AfterViewInit, ViewChild, ElementRef, OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTableDataSource } from '@angular/material/table';
import * as L from 'leaflet';
import { AuthService } from '../../../core/auth/auth';
import { LocationsService } from '../locations';
import { NotificationService } from '../../../core/services/notification';
import { ConfirmService } from '../../../core/services/confirm';
import { Location, LocationType } from '../../../core/models/location.model';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-locations-list',
  standalone: true,
  imports: [
    CommonModule, RouterLink, FormsModule,
    MatTableModule, MatPaginatorModule, MatIconModule, MatTooltipModule,
  ],
  templateUrl: './locations-list.html',
  styleUrl: './locations-list.css',
})
export class LocationsList implements OnInit, AfterViewInit, OnDestroy {
  private locationsService = inject(LocationsService);
  private authService = inject(AuthService);
  private notification = inject(NotificationService);
  private confirmService = inject(ConfirmService);

  isAdmin = this.authService.hasRole('ADMIN');
  isAgent = this.authService.hasRole('AGENT');
  canManage = this.isAdmin || this.isAgent;

  loading = signal(true);
  total = signal(0);
  searchTerm = signal('');
  typeFilter = signal<LocationType | ''>('');
  selectedLocationId = signal<number | null>(null);

  displayedColumns: string[] = ['name', 'type', 'province', 'coords', 'actions'];
  dataSource = new MatTableDataSource<Location>([]);

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild('mapContainer') mapContainer!: ElementRef<HTMLDivElement>;

  allLocations = signal<Location[]>([]);

  typeOptions = Object.values(LocationType);

  private map?: L.Map;
  private markers: L.Marker[] = [];

  ngOnInit(): void {
    this.load();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    // Attendre que les données soient chargées
    setTimeout(() => this.initMap(), 300);
  }

  ngOnDestroy(): void {
    this.map?.remove();
  }

 
  onRowClick(loc: Location, event: Event): void {
  // Éviter si clic sur bouton d'action
    const target = event.target as HTMLElement;
    if (target.closest('.action-cell')) return;

    this.selectedLocationId.set(loc.id);

    if (this.map && loc.latitude && loc.longitude) {
       this.map.flyTo([+loc.latitude, +loc.longitude], 13, {
        duration: 1.2,
       });

      // Ouvrir le popup du marqueur correspondant
       const marker = this.markers.find((m) => {
         const ll = m.getLatLng();
         return Math.abs(ll.lat - +loc.latitude!) < 0.0001
           && Math.abs(ll.lng - +loc.longitude!) < 0.0001;
       });
       marker?.openPopup();
    }
  }

  // ============================================================
  // CHARGEMENT
  // ============================================================
  private load(): void {
    this.loading.set(true);
    this.locationsService.findAll({ limit: 200 }).subscribe({
      next: (res) => {
        this.allLocations.set(res.data);
        this.total.set(res.total);
        this.loading.set(false);
        setTimeout(() => this.applyFilters(), 0);
      },
      error: () => this.loading.set(false),
    });
  }

  refresh(): void {
    this.load();
    setTimeout(() => this.refreshMapMarkers(), 400);
  }

  // ============================================================
  // CARTE LEAFLET
  // ============================================================
  private initMap(): void {
    if (!this.mapContainer) return;

    // Centre Madagascar
    this.map = L.map(this.mapContainer.nativeElement, {
      center: [-18.9, 46.8],
      zoom: 6,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
      maxZoom: 18,
    }).addTo(this.map);

    setTimeout(() => this.refreshMapMarkers(), 200);
  }

  private refreshMapMarkers(): void {
    if (!this.map) return;

    // Nettoyer
    this.markers.forEach((m) => m.remove());
    this.markers = [];

    const locations = this.dataSource.data;
    locations.forEach((loc) => {
      if (!loc.latitude || !loc.longitude) return;

      const icon = this.buildIcon(loc.type);
      const marker = L.marker([+loc.latitude, +loc.longitude], { icon })
        .bindPopup(this.buildPopup(loc))
        .addTo(this.map!);
      this.markers.push(marker);
    });
  }

  private buildIcon(type: LocationType): L.DivIcon {
    const emojis: Record<LocationType, string> = {
      [LocationType.CITY]: '🏙️',
      [LocationType.VILLAGE]: '🏘️',
      [LocationType.STATION]: '🚌',
      [LocationType.PORT]: '⚓',
      [LocationType.AIRPORT]: '✈️',
      [LocationType.TRAINSTATION]: '🚂',
      [LocationType.STOP]: '📍',
    };
    const emoji = emojis[type] ?? '📍';
    return L.divIcon({
      html: `<div class="map-marker">${emoji}</div>`,
      className: 'custom-marker',
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -32],
    });
  }

  private buildPopup(loc: Location): string {
    return `
      <div class="map-popup">
        <strong>${loc.name}</strong>
        <div class="map-popup-sub">${this.typeLabel(loc.type)}</div>
        ${loc.province ? `<div class="map-popup-sub">📍 ${loc.province}</div>` : ''}
        ${loc.address ? `<div class="map-popup-sub">${loc.address}</div>` : ''}
      </div>
    `;
  }

  // ============================================================
  // FILTRAGE
  // ============================================================
  private applyFilters(): void {
    const search = this.searchTerm().trim().toLowerCase();
    const type = this.typeFilter();

    const filtered = this.allLocations().filter((l) => {
      if (type && l.type !== type) return false;
      if (search) {
        const hay = `${l.name} ${l.province ?? ''} ${l.region ?? ''} ${l.address ?? ''}`.toLowerCase();
        if (!hay.includes(search)) return false;
      }
      return true;
    });

    this.dataSource.data = filtered;
    if (this.paginator) {
      this.paginator.length = filtered.length;
      this.paginator.pageIndex = 0;
    }
    this.refreshMapMarkers();
  }

  onSearch(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
    this.applyFilters();
  }

  clearSearch(): void {
    this.searchTerm.set('');
    this.applyFilters();
  }

  setTypeFilter(type: LocationType | ''): void {
    this.typeFilter.set(type);
    this.applyFilters();
  }

  resetFilters(): void {
    this.searchTerm.set('');
    this.typeFilter.set('');
    this.applyFilters();
  }

  hasActiveFilters = computed(() =>
    !!(this.searchTerm() || this.typeFilter()),
  );

  // ============================================================
  // ACTIONS
  // ============================================================
  remove(loc: Location): void {
    this.confirmService.ask({
      title: 'Supprimer ce lieu',
      message: `Voulez-vous vraiment supprimer "${loc.name}" ? Cette action est irréversible.`,
      confirmLabel: 'Supprimer',
      danger: true,
    })
      .pipe(filter(Boolean))
      .subscribe(() => {
        this.locationsService.remove(loc.id).subscribe({
          next: () => {
            this.allLocations.update((list) => list.filter((l) => l.id !== loc.id));
            this.total.update((t) => Math.max(0, t - 1));
            this.applyFilters();
            this.notification.success('Lieu supprimé');
          },
          error: (err) =>
            this.notification.error(err.error?.message ?? 'Suppression impossible'),
        });
      });
  }

  // ============================================================
  // HELPERS
  // ============================================================
  typeLabel(type: LocationType): string {
    const labels: Record<LocationType, string> = {
      [LocationType.CITY]: 'Ville',
      [LocationType.VILLAGE]: 'Village',
      [LocationType.STATION]: 'Gare routière',
      [LocationType.PORT]: 'Port',
      [LocationType.AIRPORT]: 'Aéroport',
      [LocationType.TRAINSTATION]: 'Gare ferroviaire',
      [LocationType.STOP]: 'Arrêt',
    };
    return labels[type] ?? type;
  }

  typeBadgeClass(type: LocationType): string {
    switch (type) {
      case LocationType.CITY: return 'badge-city';
      case LocationType.STATION: return 'badge-station';
      case LocationType.AIRPORT: return 'badge-airport';
      case LocationType.PORT: return 'badge-port';
      default: return 'badge-neutral';
    }
  }

  formatCoords(loc: Location): string {
    if (!loc.latitude || !loc.longitude) return '—';
    return `${(+loc.latitude).toFixed(4)}, ${(+loc.longitude).toFixed(4)}`;
  }
}