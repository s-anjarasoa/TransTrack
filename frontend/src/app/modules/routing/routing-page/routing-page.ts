import {
  Component, ElementRef, OnInit, ViewChild, AfterViewInit,
  inject, signal, computed, OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import {
  Subject, Subscription, debounceTime, distinctUntilChanged, switchMap, of,
} from 'rxjs';

import { AuthService } from '../../../core/auth/auth';
import { RoutingService } from '../routing';
import { environment } from '../../../../environments/environment';
import * as L from 'leaflet';
import {
  CompareResult, LocationLite, PathResult, PreviewResult,
  RoutingCriteria,
} from '../../../core/models/routing.model';

interface SocieteLite { id: number; name: string; }

const PREVIEW_COLORS = [
  '#0EA5E9', '#F59E0B', '#10B981', '#EF4444',
  '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'
];

@Component({
  selector: 'app-routing-page',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  templateUrl: './routing-page.html',
  styleUrl: './routing-page.css',
})
export class RoutingPage implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('mapContainer', { static: false }) mapContainer!: ElementRef<HTMLDivElement>;

  private authService = inject(AuthService);
  private routingService = inject(RoutingService);
  private http = inject(HttpClient);

  readonly RoutingCriteria = RoutingCriteria;
  readonly isClient = this.authService.hasRole('CLIENT');
  readonly isAgent = this.authService.hasRole('AGENT');
  readonly isAdmin = this.authService.hasRole('ADMIN');

  criteria = signal<RoutingCriteria>(RoutingCriteria.DISTANCE);
  startSelected = signal<LocationLite | null>(null);
  endSelected = signal<LocationLite | null>(null);
  startQuery = signal('');
  endQuery = signal('');
  startSuggestions = signal<LocationLite[]>([]);
  endSuggestions = signal<LocationLite[]>([]);
  showStartDropdown = signal(false);
  showEndDropdown = signal(false);

  societes = signal<SocieteLite[]>([]);
  societeFilter = signal<number | null>(null);

  loading = signal(false);
  previewLoading = signal(false);
  result = signal<PathResult | null>(null);
  previewResult = signal<PreviewResult | null>(null);
  compareResult = signal<CompareResult | null>(null);
  error = signal<string | null>(null);

  canSearch = computed(() =>
    !!this.startSelected() && !!this.endSelected() &&
    this.startSelected()!.id !== this.endSelected()!.id
  );

  private startInput$ = new Subject<string>();
  private endInput$ = new Subject<string>();
  private previewTrigger$ = new Subject<{ startId: number; endId: number }>();
  private subs = new Subscription();

  private map?: L.Map;
  private layerGroup?: L.LayerGroup;

  ngOnInit(): void {
    this.subs.add(
      this.startInput$.pipe(
        debounceTime(250), distinctUntilChanged(),
        switchMap((q) => q.length >= 2 ? this.routingService.searchLocations(q) : of([])),
      ).subscribe((list) => {
        this.startSuggestions.set(list);
        this.showStartDropdown.set(list.length > 0);
      }),
    );

    this.subs.add(
      this.endInput$.pipe(
        debounceTime(250), distinctUntilChanged(),
        switchMap((q) => q.length >= 2 ? this.routingService.searchLocations(q) : of([])),
      ).subscribe((list) => {
        this.endSuggestions.set(list);
        this.showEndDropdown.set(list.length > 0);
      }),
    );

    this.subs.add(
      this.previewTrigger$.pipe(
        debounceTime(300),
        switchMap(({ startId, endId }) => {
          this.previewLoading.set(true);
          const societeId = this.isAdmin ? this.societeFilter() ?? undefined : undefined;
          return this.routingService.preview(startId, endId, societeId);
        }),
      ).subscribe({
        next: (preview) => {
          this.previewResult.set(preview);
          this.previewLoading.set(false);
          this.drawPreview(preview);
        },
        error: (err) => {
          this.previewLoading.set(false);
          console.error('❌ Preview error:', err);
        },
      }),
    );

    if (this.isAdmin) this.loadSocietes();
  }

  ngAfterViewInit(): void { this.initMap(); }
  ngOnDestroy(): void { this.subs.unsubscribe(); this.map?.remove(); }

  private loadSocietes(): void {
    this.http.get<any>(`${environment.apiUrl}/societes`).subscribe({
      next: (res) => {
        const list: SocieteLite[] = Array.isArray(res) ? res : (res?.data ?? []);
        this.societes.set(list);
      },
      error: () => this.societes.set([]),
    });
  }

  onSocieteFilterChange(event: Event): void {
    const v = (event.target as HTMLSelectElement).value;
    this.societeFilter.set(v ? +v : null);
    this.triggerPreview();
  }

  private initMap(): void {
    if (!this.mapContainer) return;
    this.map = L.map(this.mapContainer.nativeElement, {
      center: [-18.88, 47.51], zoom: 6, zoomControl: true,
    });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19, attribution: '© OpenStreetMap contributors',
    }).addTo(this.map);
    this.layerGroup = L.layerGroup().addTo(this.map);
  }

  // ─── Tracé de TOUS les itinéraires (preview) ───
  private drawPreview(preview: PreviewResult): void {
    if (!this.map || !this.layerGroup) return;
    this.layerGroup.clearLayers();
    if (preview.paths.length === 0) return;

    const allBounds = L.latLngBounds([]);

    preview.paths.forEach((path, idx) => {
      const color = PREVIEW_COLORS[idx % PREVIEW_COLORS.length];
      const points: L.LatLngExpression[] = path.waypoints.map(w => [w.latitude, w.longitude]);

      if (points.length < 2) return;

      // Tracer la ligne
      const polyline = L.polyline(points, {
        color,
        weight: idx === 0 ? 5 : 4,
        opacity: 0.85,
        dashArray: idx === 0 ? undefined : '8, 6',
      }).addTo(this.layerGroup!);

      polyline.bindPopup(
        `<b>Itinéraire ${idx + 1} (${path.type})</b><br>` +
        `${path.routeNames.join(' + ')}<br>` +
        `${path.totalDistance} km • ${path.totalCost.toLocaleString('fr-FR')} Ar`
      );

      allBounds.extend(polyline.getBounds());

      // ✅ SUPPRESSION DU if (idx === 0) : On affiche les marqueurs pour TOUS les itinéraires
      path.waypoints.forEach((wp, i) => {
        let label = '';
        let bgColor = color; // On utilise la couleur de l'itinéraire
        
        if (i === 0) {
          label = 'A';
          bgColor = '#16A34A'; // Vert départ
        } else if (i === path.waypoints.length - 1) {
          label = 'Z';
          bgColor = '#DC2626'; // Rouge arrivée
        } else {
          label = i < 26 ? String.fromCharCode(65 + i) : String(i);
        }

        L.marker([wp.latitude, wp.longitude], {
          icon: this.makeIcon(bgColor, label),
        })
          .bindPopup(`<b>Itinéraire ${idx + 1} : ${i === 0 ? 'Départ' : i === path.waypoints.length - 1 ? 'Arrivée' : 'Étape ' + i}</b><br>${wp.name}`)
          .addTo(this.layerGroup!);
      });
    });

    if (allBounds.isValid()) this.map.fitBounds(allBounds, { padding: [40, 40] });
  }

  // ─── Tracé du chemin optimal (après "Rechercher") ───
  private drawRoute(result: PathResult): void {
    if (!this.map || !this.layerGroup) return;
    this.layerGroup.clearLayers();
    if (!result.found || result.path.length === 0) return;

    let waypoints = result.waypoints;
    if (!waypoints || waypoints.length === 0) {
      waypoints = [];
      const first = result.path[0];
      waypoints.push({ name: first.fromName, latitude: first.fromLat, longitude: first.fromLng });
      for (const step of result.path) {
        waypoints.push({ name: step.toName, latitude: step.toLat, longitude: step.toLng });
      }
    }

    const points: L.LatLngExpression[] = waypoints.map(w => [w.latitude, w.longitude]);

    waypoints.forEach((wp, i) => {
      let label = '';
      let bgColor = '#0EA5E9';

      if (i === 0) { label = 'A'; bgColor = '#16A34A'; }
      else if (i === waypoints!.length - 1) { label = 'Z'; bgColor = '#DC2626'; }
      else { label = i < 26 ? String.fromCharCode(65 + i) : String(i); }

      L.marker([wp.latitude, wp.longitude], { icon: this.makeIcon(bgColor, label) })
        .bindPopup(`<b>${i === 0 ? 'Départ' : i === waypoints!.length - 1 ? 'Arrivée' : 'Étape ' + i}</b><br>${wp.name}`)
        .addTo(this.layerGroup!);
    });

    const polyline = L.polyline(points, { color: '#0EA5E9', weight: 5, opacity: 0.85 }).addTo(this.layerGroup);
    this.map.fitBounds(polyline.getBounds(), { padding: [40, 40] });
  }
  
  // ─── Comparaison A* vs Dijkstra ───
  private drawCompare(c: CompareResult): void {
    if (!this.map || !this.layerGroup) return;
    this.layerGroup.clearLayers();

    const drawPathAndMarkers = (waypoints: any[], color: string, dashed: boolean, isAstar: boolean) => {
      if (!waypoints || waypoints.length < 2) return null;
      const points: L.LatLngExpression[] = waypoints.map(w => [w.latitude, w.longitude]);

      const polyline = L.polyline(points, {
        color, weight: 5, opacity: 0.85, dashArray: dashed ? '10, 8' : undefined,
      }).addTo(this.layerGroup!);

      waypoints.forEach((wp, i) => {
        let label = '';
        let bgColor = color;

        if (i === 0) { label = 'A'; bgColor = '#16A34A'; }
        else if (i === waypoints.length - 1) { label = 'Z'; bgColor = '#DC2626'; }
        else { label = i < 26 ? String.fromCharCode(65 + i) : String(i); }

        L.marker([wp.latitude, wp.longitude], { icon: this.makeIcon(bgColor, label) })
          .bindPopup(`<b>${isAstar ? 'A*' : 'Dijkstra'} - ${i === 0 ? 'Départ' : i === waypoints.length - 1 ? 'Arrivée' : 'Étape'}</b><br>${wp.name}`)
          .addTo(this.layerGroup!);
      });

      return polyline;
    };

    // Utilisation des waypoints pour tracer les lignes (A* en bleu, Dijkstra en violet pointillé)
    const aPath = drawPathAndMarkers(c.astar.waypoints ?? [], '#0EA5E9', false, true);
    const dPath = drawPathAndMarkers(c.dijkstra.waypoints ?? [], '#7C3AED', true, false);

    const bounds = L.latLngBounds([]);
    if (aPath) bounds.extend(aPath.getBounds());
    if (dPath) bounds.extend(dPath.getBounds());
    if (bounds.isValid()) this.map.fitBounds(bounds, { padding: [40, 40] });
  }

  private makeIcon(color: string, label: string): L.DivIcon {
    return L.divIcon({
      className: 'custom-marker',
      html: `<div style="background:${color};color:white;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,.3);">${label}</div>`,
      iconSize: [32, 32], iconAnchor: [16, 16],
    });
  }

  onStartInput(value: string): void {
    this.startQuery.set(value);
    if (value.trim().length < 2) { this.startSelected.set(null); this.startSuggestions.set([]); this.showStartDropdown.set(false); return; }
    this.startInput$.next(value);
  }

  onEndInput(value: string): void {
    this.endQuery.set(value);
    if (value.trim().length < 2) { this.endSelected.set(null); this.endSuggestions.set([]); this.showEndDropdown.set(false); return; }
    this.endInput$.next(value);
  }

  selectStart(loc: LocationLite): void { this.startSelected.set(loc); this.startQuery.set(loc.name); this.showStartDropdown.set(false); this.triggerPreview(); }
  selectEnd(loc: LocationLite): void { this.endSelected.set(loc); this.endQuery.set(loc.name); this.showEndDropdown.set(false); this.triggerPreview(); }
  hideStartDropdown(): void { this.showStartDropdown.set(false); }
  hideEndDropdown(): void { this.showEndDropdown.set(false); }

  swap(): void {
    const s = this.startSelected(); const e = this.endSelected();
    const sq = this.startQuery(); const eq = this.endQuery();
    this.startSelected.set(e); this.endSelected.set(s);
    this.startQuery.set(eq); this.endQuery.set(sq);
    this.triggerPreview();
  }

  private triggerPreview(): void {
    const s = this.startSelected(); const e = this.endSelected();
    this.result.set(null); this.compareResult.set(null);
    if (!s || !e || s.id === e.id) { this.previewResult.set(null); this.layerGroup?.clearLayers(); return; }
    this.previewTrigger$.next({ startId: s.id, endId: e.id });
  }

  search(): void {
    if (!this.canSearch()) return;
    this.loading.set(true); this.error.set(null); this.result.set(null); this.compareResult.set(null);
    const start = this.startSelected()!; const end = this.endSelected()!;
    const societeId = this.isAdmin ? this.societeFilter() ?? undefined : undefined;

    this.routingService.findPath(start.id, end.id, this.criteria(), societeId).subscribe({
      next: (res) => { this.result.set(res); this.loading.set(false); if (res.found) this.drawRoute(res); },
      error: (err) => { this.loading.set(false); this.error.set(err?.error?.message ?? 'Erreur lors du calcul'); },
    });
  }

  runCompare(): void {
    if (!this.canSearch() || !this.isAdmin) return;
    this.loading.set(true); this.error.set(null); this.compareResult.set(null);
    const start = this.startSelected()!; const end = this.endSelected()!;

    this.routingService.compare(start.id, end.id, this.criteria()).subscribe({
      next: (res) => { this.compareResult.set(res); this.loading.set(false); this.drawCompare(res); },
      error: (err) => { this.loading.set(false); this.error.set(err?.error?.message ?? 'Erreur lors de la comparaison'); },
    });
  }

  reset(): void {
    this.startSelected.set(null); this.endSelected.set(null);
    this.startQuery.set(''); this.endQuery.set('');
    this.result.set(null); this.previewResult.set(null); this.compareResult.set(null); this.error.set(null);
    this.layerGroup?.clearLayers(); this.map?.setView([-18.88, 47.51], 6);
  }

  formatDuration(minutes: number): string {
    const h = Math.floor(minutes / 60); const m = Math.round(minutes % 60);
    if (h === 0) return `${m} min`;
    return m === 0 ? `${h}h` : `${h}h ${m}min`;
  }
  formatAriary(v: number): string { return `${Number(v).toLocaleString('fr-FR')} Ar`; }
  getPreviewColor(idx: number): string { return PREVIEW_COLORS[idx % PREVIEW_COLORS.length]; }
}