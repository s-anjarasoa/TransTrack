import {
  Component, inject, signal, computed, OnInit, AfterViewInit,
  ViewChild, ElementRef, OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import * as L from 'leaflet';

import { LocationsService } from '../locations';
import { NotificationService } from '../../../core/services/notification';
import { Location, LocationType } from '../../../core/models/location.model';
import {
  Subject, debounceTime, switchMap, of, catchError,
} from 'rxjs';

// ═══════════════════════════════════════════════════════════
// FIX icônes Leaflet
// ═══════════════════════════════════════════════════════════
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const REGION_TO_PROVINCE: Record<string, string> = {
  'Analamanga': 'Antananarivo',
  'Vakinankaratra': 'Antananarivo',
  'Bongolava': 'Antananarivo',
  'Itasy': 'Antananarivo',
  'Diana': 'Antsiranana',
  'Sava': 'Antsiranana',
  'Haute Matsiatra': 'Fianarantsoa',
  "Amoron'i Mania": 'Fianarantsoa',
  'Vatovavy': 'Fianarantsoa',
  'Fitovinany': 'Fianarantsoa',
  'Vatovavy-Fitovinany': 'Fianarantsoa',
  'Ihorombe': 'Fianarantsoa',
  'Atsimo-Atsinanana': 'Fianarantsoa',
  'Boeny': 'Mahajanga',
  'Betsiboka': 'Mahajanga',
  'Melaky': 'Mahajanga',
  'Sofia': 'Mahajanga',
  'Atsinanana': 'Toamasina',
  'Analanjirofo': 'Toamasina',
  'Alaotra-Mangoro': 'Toamasina',
  'Atsimo-Andrefana': 'Toliara',
  'Androy': 'Toliara',
  'Anosy': 'Toliara',
  'Menabe': 'Toliara',
};

@Component({
  selector: 'app-location-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, MatIconModule],
  templateUrl: './locations-form.html',
  styleUrl: './locations-form.css',
  host: {
    '[style.isolation]': "'isolate'",
  },
})
export class LocationForm implements OnInit, AfterViewInit, OnDestroy {
  private locationsService = inject(LocationsService);
  private notification = inject(NotificationService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  @ViewChild('mapContainer') mapContainer!: ElementRef<HTMLDivElement>;

  // ═══════════════════════════════════════════════════════
  // SIGNAUX (nettoyés)
  // ═══════════════════════════════════════════════════════
  isEdit = signal(false);
  loading = signal(false);          // interne uniquement
  submitting = signal(false);
  errorMessage = signal<string | null>(null);

  currentZoom = signal(6);

  zoomLevelLabel = computed(() => {
    const z = this.currentZoom();
    if (z <= 7) return 'Province';
    if (z <= 10) return 'Région';
    if (z <= 13) return 'Ville';
    if (z <= 15) return 'Quartier';
    return 'Rue';
  });

  private addressChange$ = new Subject<string>();

  form = signal<Partial<Location>>({
    name: '',
    type: LocationType.CITY,
    province: '',
    region: '',
    latitude: undefined,
    longitude: undefined,
    address: '',
    isActive: true,
  });

  typeOptions = Object.values(LocationType);
  provinces = signal<string[]>([]);

  private map?: L.Map;
  private marker?: L.Marker;

  // ═══════════════════════════════════════════════════════
  // CYCLE DE VIE
  // ═══════════════════════════════════════════════════════
  ngOnInit(): void {
    this.loadProvinces();

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEdit.set(true);
      this.loadLocation(+id);
    }
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.initMap(), 150);
  }

  ngOnDestroy(): void {
    this.addressChange$.complete();
    this.map?.remove();
  }

  // ═══════════════════════════════════════════════════════
  // CHARGEMENT
  // ═══════════════════════════════════════════════════════
  private loadProvinces(): void {
    this.locationsService.getProvinces().subscribe({
      next: (p) => this.provinces.set(p),
      error: () => {},
    });
  }

  private loadLocation(id: number): void {
    this.loading.set(true);
    this.locationsService.findOne(id).subscribe({
      next: (loc) => {
        this.form.set(loc);
        this.loading.set(false);
        setTimeout(() => this.updateMarkerFromForm(), 300);
      },
      error: () => {
        this.loading.set(false);
        this.notification.error('Lieu introuvable');
        this.router.navigate(['/locations']);
      },
    });
  }

  // ═══════════════════════════════════════════════════════
  // ZOOM PROGRESSIF (SILENCIEUX)
  // ═══════════════════════════════════════════════════════
  private setupProgressiveZoom(): void {
    this.addressChange$
      .pipe(
        debounceTime(700),
        switchMap(() => this.buildGeocodeRequest()),
      )
      .subscribe();
  }

  private buildGeocodeRequest() {
    if (!this.map) return of(null);

    const { province, region, address } = this.form();
    const hasProvince = !!province && province.trim().length >= 3;
    const hasRegion   = !!region   && region.trim().length   >= 3;
    const hasAddress  = !!address  && address.trim().length  >= 3;

    if (!hasProvince && !hasRegion && !hasAddress) return of(null);

    if (hasProvince && !hasRegion && !hasAddress) {
      this.flyToProvince(province!);
      return of(null);
    }

    let parts: string[] = [];
    let zoom = 12;

    if (hasAddress && (hasProvince || hasRegion)) {
      parts = [address!, region, province, 'Madagascar'].filter(Boolean) as string[];
      zoom = 14;
    } else if (hasAddress) {
      parts = [address!, 'Madagascar'];
      zoom = 12;
    } else if (hasProvince && hasRegion) {
      parts = [region!, province!, 'Madagascar'];
      zoom = 11;
    } else if (hasRegion) {
      parts = [region!, 'Madagascar'];
      zoom = 10;
    }

    if (parts.length === 0) return of(null);

    return this.geocodeAndFly(parts.join(', '), zoom);
  }

  private geocodeAndFly(query: string, targetZoom: number) {
    return this.locationsService.geocode(query).pipe(
      catchError(() => of(null)),
      switchMap((res) => {
        if (res && this.map) {
          const currentZoom = this.map.getZoom();
          const zoom = Math.max(currentZoom, Math.min(targetZoom, 15));

          this.setMarker(res.lat, res.lng);
          this.map.flyTo([res.lat, res.lng], zoom, { duration: 1 });

          const { latitude, longitude } = this.form();
          if (!latitude || !longitude) {
            this.form.update((f) => ({
              ...f,
              latitude: +res.lat.toFixed(7),
              longitude: +res.lng.toFixed(7),
            }));
          }
        }
        return of(null);
      }),
    );
  }

  private flyToProvince(province: string): void {
    if (!this.map) return;

    this.locationsService.getProvinceInfo(province)
      .pipe(
        catchError(() => {
          return this.locationsService.geocode(`${province}, Madagascar`).pipe(
            switchMap((res) => {
              if (res && this.map) {
                this.map.flyTo([res.lat, res.lng], 9, { duration: 1.2 });
                this.setMarker(res.lat, res.lng);
              }
              return of(null);
            }),
          );
        }),
      )
      .subscribe((info: any) => {
        if (info?.center && this.map) {
          this.map.flyTo(info.center, info.zoom, { duration: 1.2 });
        }
      });
  }

  // ═══════════════════════════════════════════════════════
  // REVERSE GEOCODING (SILENCIEUX)
  // ═══════════════════════════════════════════════════════
  private reverseFillFromCoordinates(lat: number, lng: number): void {
    this.locationsService.reverseGeocode(lat, lng).subscribe({
      next: (res) => {
        if (!res) return;

        const updates: Partial<Location> = {};
        const current = this.form();

        const addrParts = [res.road, res.suburb].filter(Boolean);
        if (addrParts.length) updates.address = addrParts.join(', ');

        if (res.state) updates.region = res.state;

        if (!current.province && res.state) {
          const guessed = REGION_TO_PROVINCE[res.state];
          if (guessed) updates.province = guessed;
        }

        this.form.update((f) => ({ ...f, ...updates }));
      },
      error: () => {
        // Silent fail
      },
    });
  }

  // ═══════════════════════════════════════════════════════
  // BOUTONS CARTE
  // ═══════════════════════════════════════════════════════
  zoomToProvince(): void {
    const p = this.form().province;
    if (p) this.flyToProvince(p);
  }

  centerOnMarker(): void {
    const { latitude, longitude } = this.form();
    if (latitude && longitude && this.map) {
      this.map.flyTo([+latitude, +longitude], 15, { duration: 0.8 });
    }
  }

  resetMapView(): void {
    this.map?.flyTo([-18.9, 46.8], 6, { duration: 1 });
  }

  // ═══════════════════════════════════════════════════════
  // CARTE
  // ═══════════════════════════════════════════════════════
  private initMap(): void {
    if (!this.mapContainer) return;

    const lat = this.form().latitude ?? -18.9137;
    const lng = this.form().longitude ?? 47.5361;
    const zoom = this.form().latitude ? 12 : 6;

    this.map = L.map(this.mapContainer.nativeElement, {
      center: [lat, lng],
      zoom,
      minZoom: 5,
      maxBounds: [
        [-26.5, 42.0],
        [-11.0, 51.5],
      ],
      maxBoundsViscosity: 0.8,
    });

    this.currentZoom.set(Math.round(this.map.getZoom()));
    this.setupProgressiveZoom();

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
      maxZoom: 18,
    }).addTo(this.map);

    this.map.on('zoomend', () => {
      this.currentZoom.set(Math.round(this.map!.getZoom()));
    });

    this.map.on('click', (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      this.setMarker(lat, lng);

      this.form.update((f) => ({
        ...f,
        latitude: +lat.toFixed(7),
        longitude: +lng.toFixed(7),
      }));

      this.reverseFillFromCoordinates(lat, lng);
    });

    if (this.form().latitude && this.form().longitude) {
      this.updateMarkerFromForm();
    }
  }

  private setMarker(lat: number, lng: number): void {
    if (this.marker) {
      this.marker.setLatLng([lat, lng]);
    } else {
      this.marker = L.marker([lat, lng], { draggable: true }).addTo(this.map!);
      this.marker.on('dragend', (e) => {
        const pos = (e.target as L.Marker).getLatLng();
        this.form.update((f) => ({
          ...f,
          latitude: +pos.lat.toFixed(7),
          longitude: +pos.lng.toFixed(7),
        }));
        this.reverseFillFromCoordinates(pos.lat, pos.lng);
      });
    }
  }

  private updateMarkerFromForm(): void {
    const { latitude, longitude } = this.form();
    if (latitude && longitude && this.map) {
      this.setMarker(+latitude, +longitude);
      this.map.setView([+latitude, +longitude], 12);
    }
  }

  // ═══════════════════════════════════════════════════════
  // FORMULAIRE
  // ═══════════════════════════════════════════════════════
  updateField<K extends keyof Location>(field: K, value: any): void {
    this.form.update((f) => ({ ...f, [field]: value }));

    if (['province', 'region', 'address'].includes(field as string)) {
      this.addressChange$.next(`${field}:${value}`);
    }
  }

  onTypeChange(value: LocationType): void {
    this.updateField('type', value);
  }

  submit(): void {
    const form = this.form();
    this.errorMessage.set(null);

    if (!form.name?.trim()) {
      this.errorMessage.set('Le nom est requis');
      return;
    }
    if (!form.type) {
      this.errorMessage.set('Le type est requis');
      return;
    }

    this.submitting.set(true);

    const payload = { ...form };
    if (!payload.latitude || !payload.longitude) {
      delete payload.latitude;
      delete payload.longitude;
    }

    const request$ = this.isEdit()
      ? this.locationsService.update(payload.id!, payload)
      : this.locationsService.create(payload);

    request$.subscribe({
      next: () => {
        this.submitting.set(false);
        this.notification.success(
          this.isEdit() ? 'Lieu mis à jour' : 'Lieu créé avec succès',
        );
        this.router.navigate(['/locations']);
      },
      error: (err) => {
        this.submitting.set(false);
        this.errorMessage.set(err.error?.message ?? 'Erreur lors de l\'enregistrement');
      },
    });
  }

  cancel(): void {
    this.router.navigate(['/locations']);
  }

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
}