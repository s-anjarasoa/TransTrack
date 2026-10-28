import { Component, inject, signal, computed, OnInit, AfterViewInit, ViewChild, ElementRef, OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import * as L from 'leaflet';
import { AuthService } from '../../../core/auth/auth';
import { RoutesService } from '../routes-trajet';
import { NotificationService } from '../../../core/services/notification';
import { Route, RouteStatut, RouteStopType } from '../../../core/models/route.model';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

@Component({
  selector: 'app-route-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule, MatTooltipModule],
  templateUrl: './route-detail.html',
  styleUrl: './route-detail.css',
})
export class RouteDetail implements OnInit, AfterViewInit, OnDestroy {
  private routesService = inject(RoutesService);
  private notification = inject(NotificationService);
  private authService = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  @ViewChild('mapContainer') mapContainer!: ElementRef<HTMLDivElement>;

  // ✅ Rôles
  isAdmin = this.authService.hasRole('ADMIN');
  isAgent = this.authService.hasRole('AGENT');
  canEdit = computed(() => this.isAdmin || this.isAgent);

  // ✅ État
  loading = signal(true);
  route_data = signal<Route | null>(null);
  currentZoom = signal(6);

  // ✅ Computed
  stops = computed(() => this.route_data()?.stops ?? []);

  filledStops = computed(() =>
    this.stops().filter((s) => s.location?.latitude && s.location?.longitude),
  );

  zoomLevelLabel = computed(() => {
    const z = this.currentZoom();
    if (z <= 7) return 'Province';
    if (z <= 10) return 'Région';
    if (z <= 13) return 'Ville';
    if (z <= 15) return 'Quartier';
    return 'Rue';
  });

  totalDistance = computed(() => this.route_data()?.distance ?? 0);

  private map?: L.Map;
  private markers: L.Marker[] = [];
  private polyline?: L.Polyline;

  // ═══════════════════════════════════════════════════════════
  // CYCLE DE VIE
  // ═══════════════════════════════════════════════════════════
  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.router.navigate(['/routes']);
      return;
    }
    this.loadRoute(+id);
  }

  ngAfterViewInit(): void {
    // Attendre le chargement des données avant d'initialiser la carte
    setTimeout(() => {
      if (this.route_data()) {
        this.initMap();
      }
    }, 200);
  }

  ngOnDestroy(): void {
    this.map?.remove();
  }

  // ═══════════════════════════════════════════════════════════
  // CHARGEMENT
  // ═══════════════════════════════════════════════════════════
  private loadRoute(id: number): void {
    this.loading.set(true);
    this.routesService.findOne(id).subscribe({
      next: (r) => {
        this.route_data.set(r);
        this.loading.set(false);

        // Init map après le rendu
        setTimeout(() => {
          if (!this.map && this.mapContainer) {
            this.initMap();
          } else if (this.map) {
            this.drawOnMap();
          }
        }, 150);
      },
      error: () => {
        this.loading.set(false);
        this.notification.error('Itinéraire introuvable');
        this.router.navigate(['/routes']);
      },
    });
  }

  refresh(): void {
    const id = this.route_data()?.id;
    if (id) {
      this.loadRoute(id);
      setTimeout(() => this.drawOnMap(), 400);
    }
  }

  // ═══════════════════════════════════════════════════════════
  // CARTE
  // ═══════════════════════════════════════════════════════════
  private initMap(): void {
    if (!this.mapContainer || !this.route_data()) return;

    const stops = this.filledStops();
    const center = stops.length > 0
      ? [+stops[0].location!.latitude!, +stops[0].location!.longitude!]
      : [-18.9137, 47.5361];

    this.map = L.map(this.mapContainer.nativeElement, {
      center: center as [number, number],
      zoom: stops.length > 1 ? 7 : 10,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
      maxZoom: 18,
    }).addTo(this.map);

    this.currentZoom.set(Math.round(this.map.getZoom()));
    this.map.on('zoomend', () => {
      this.currentZoom.set(Math.round(this.map!.getZoom()));
    });

    this.drawOnMap();
  }

  private drawOnMap(): void {
    if (!this.map || !this.route_data()) return;

    // Nettoyer
    this.markers.forEach((m) => m.remove());
    this.markers = [];
    this.polyline?.remove();

    const stops = this.filledStops();
    if (stops.length === 0) return;

    const latLngs: [number, number][] = [];

    // ── Dessiner les marqueurs numérotés ──
    stops.forEach((stop, idx) => {
      const lat = +stop.location!.latitude!;
      const lng = +stop.location!.longitude!;
      latLngs.push([lat, lng]);

      const isStart = idx === 0;
      const isEnd = idx === stops.length - 1;

      // Type de badge : A / 1 / 2 / ... / Z
      const label = isStart ? 'A' : isEnd ? 'Z' : String(idx);

      const color = isStart ? '#10B981' : isEnd ? '#EF4444' : '#0E7490';

      const icon = L.divIcon({
        html: `
          <div class="route-marker" style="--marker-color: ${color}">
            <span>${label}</span>
          </div>
        `,
        className: 'custom-route-marker',
        iconSize: [36, 44],
        iconAnchor: [18, 44],
        popupAnchor: [0, -44],
      });

      const marker = L.marker([lat, lng], { icon })
        .bindPopup(this.buildPopup(stop, idx))
        .addTo(this.map!);

      this.markers.push(marker);
    });

    // ── Dessiner la polyligne ──
    if (latLngs.length >= 2) {
      this.polyline = L.polyline(latLngs, {
        color: '#0E7490',
        weight: 4,
        opacity: 0.8,
        lineJoin: 'round',
        lineCap: 'round',
        dashArray: '8,6',   // effet pointillé
      }).addTo(this.map);

      // Fit bounds avec padding
      this.map.fitBounds(this.polyline.getBounds(), {
        padding: [40, 40],
        maxZoom: 12,
      });
    } else {
      this.map.setView(latLngs[0], 12);
    }
  }

  private buildPopup(stop: any, idx: number): string {
    const loc = stop.location;
    const isStart = idx === 0;
    const isEnd = idx === this.stops().length - 1;
    const typeLabel = isStart
      ? 'Départ'
      : isEnd
      ? 'Arrivée'
      : `Étape ${idx}`;

    return `
      <div class="route-popup">
        <div class="route-popup-header" style="color: ${
          isStart ? '#10B981' : isEnd ? '#EF4444' : '#0E7490'
        }">
          <strong>${typeLabel}</strong>
        </div>
        <div class="route-popup-name">${loc.name}</div>
        ${loc.province ? `<div class="route-popup-meta">📍 ${loc.province}</div>` : ''}
        ${
          stop.distanceDepuisDepart !== undefined
            ? `<div class="route-popup-meta">📏 ${stop.distanceDepuisDepart} km depuis le départ</div>`
            : ''
        }
        ${
          stop.heureDepartRel
            ? `<div class="route-popup-meta">⏱️ +${this.formatMinutes(stop.heureDepartRel)}</div>`
            : ''
        }
      </div>
    `;
  }

  // ═══════════════════════════════════════════════════════════
  // ACTIONS CARTE
  // ═══════════════════════════════════════════════════════════
  zoomToFit(): void {
    if (!this.map || this.polyline) {
      this.polyline && this.map?.fitBounds(this.polyline.getBounds(), {
        padding: [40, 40],
        maxZoom: 12,
      });
      return;
    }
    const stops = this.filledStops();
    if (stops.length && this.map) {
      const bounds = L.latLngBounds(
        stops.map((s) => [+s.location!.latitude!, +s.location!.longitude!] as [number, number]),
      );
      this.map.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 });
    }
  }

  zoomIn(): void  { this.map?.zoomIn(); }
  zoomOut(): void { this.map?.zoomOut(); }

  // ═══════════════════════════════════════════════════════════
  // HELPERS TEMPLATE
  // ═══════════════════════════════════════════════════════════
  statutMeta(statut: RouteStatut) {
    switch (statut) {
      case RouteStatut.ACTIVE:
        return { label: 'Active', cls: 'badge-success', icon: 'check_circle' };
      case RouteStatut.INACTIVE:
        return { label: 'Inactive', cls: 'badge-neutral', icon: 'pause_circle' };
      case RouteStatut.SUSPENDUE:
        return { label: 'Suspendue', cls: 'badge-danger', icon: 'cancel' };
    }
  }

  stopTypeLabel(index: number): string {
    if (index === 0) return 'Départ';
    if (index === this.stops().length - 1) return 'Arrivée';
    return `Étape ${index}`;
  }

  stopTypeColor(index: number): string {
    if (index === 0) return 'dot-success';
    if (index === this.stops().length - 1) return 'dot-danger';
    return 'dot-primary';
  }

  stopIcon(stop: any): string {
    if (stop.type === RouteStopType.DEPART) return 'trip_origin';
    if (stop.type === RouteStopType.ARRIVEE) return 'place';
    return 'more_horiz';
  }

  formatDuree(minutes?: number | null): string {
    if (!minutes) return '—';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h > 0
      ? `${h}h${m > 0 ? m.toString().padStart(2, '0') : ''}`
      : `${m} min`;
  }

  formatMinutes(min: number): string {
    if (min < 60) return `${min} min`;
    const h = Math.floor(min / 60);
    const m = min % 60;
    return `${h}h${m.toString().padStart(2, '0')}`;
  }

  getMoyenTransIcon(nom?: string): string {
    if (!nom) return 'commute';
    const lower = nom.toLowerCase();
    if (lower.includes('bus')) return 'directions_bus';
    if (lower.includes('train')) return 'train';
    if (lower.includes('avion') || lower.includes('air')) return 'flight';
    if (lower.includes('bateau') || lower.includes('ferry')) return 'directions_boat';
    if (lower.includes('taxi')) return 'local_taxi';
    if (lower.includes('camion')) return 'local_shipping';
    return 'commute';
  }
}