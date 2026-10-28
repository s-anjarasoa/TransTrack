import {
  Component, inject, signal, computed, OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { RoutesService } from '../routes-trajet';
import { MoyensTransService } from '../../moyens-trans/moyens-trans';
import { NotificationService } from '../../../core/services/notification';
import { LocationAutocomplete } from '../../../shared/components/location-autocomplete/location-autocomplete';
import { Location } from '../../../core/models/location.model';
import { MoyenTrans } from '../../../core/models/moyen-trans.model';
import { Route, RouteStatut } from '../../../core/models/route.model';

interface StopDraft {
  tempId: number;
  location: Location | null;
}

@Component({
  selector: 'app-route-form',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterLink,
    MatIconModule, MatTooltipModule, MatSelectModule,
    MatFormFieldModule, MatInputModule,
    LocationAutocomplete,
  ],
  templateUrl: './route-form.html',
  styleUrl: './route-form.css',
})
export class RouteForm implements OnInit {
  private routesService = inject(RoutesService);
  private moyensTransService = inject(MoyensTransService);
  private notification = inject(NotificationService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  isEdit = signal(false);
  submitting = signal(false); // Gardé uniquement pour désactiver le bouton
  errorMessage = signal<string | null>(null);
  submitted = signal(false);

  // ─── Form state ───
  nom = signal<string>('');
  description = signal<string>('');
  moyenTransId = signal<number | null>(null);
  dureeEstimee = signal<number | null>(null);
  statut = signal<RouteStatut>(RouteStatut.ACTIVE);

  // Stops (au moins 2 : départ + arrivée)
  stops = signal<StopDraft[]>([
    { tempId: 1, location: null },
    { tempId: 2, location: null },
  ]);

  private tempIdCounter = 3;

  // ─── Options ───
  moyensTrans = signal<MoyenTrans[]>([]);
  statutOptions = Object.values(RouteStatut);

  // ─── Computed ───
  canAddStop = computed(() => this.stops().length < 10);
  canRemoveStop = computed(() => this.stops().length > 2);

  filledStops = computed(() =>
    this.stops().filter((s) => s.location !== null),
  );

  estimatedDistance = computed(() => {
    const stops = this.filledStops();
    if (stops.length < 2) return null;

    let total = 0;
    for (let i = 1; i < stops.length; i++) {
      const a = stops[i - 1].location!;
      const b = stops[i].location!;
      if (a.latitude && a.longitude && b.latitude && b.longitude) {
        total += this.haversineKm(
          +a.latitude, +a.longitude,
          +b.latitude, +b.longitude,
        );
      }
    }
    return Math.round(total * 100) / 100;
  });

  // ─── Lifecycle ───
  ngOnInit(): void {
    this.loadMoyensTrans();

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEdit.set(true);
      this.loadRoute(+id);
    }
  }

  // ─── Loaders ───
  private loadMoyensTrans(): void {
    this.moyensTransService.findAll({ limit: 100 }).subscribe({
      next: (res: any) => this.moyensTrans.set(res.data ?? res),
      error: () =>
        this.notification.error('Impossible de charger les moyens de transport'),
    });
  }

  private loadRoute(id: number): void {
    this.routesService.findOne(id).subscribe({
      next: (r) => {
        this.nom.set(r.nom ?? '');
        this.description.set(r.description ?? '');
        this.moyenTransId.set(r.moyenTransId);
        this.dureeEstimee.set(r.dureeEstimee ?? null);
        this.statut.set(r.statut);

        const drafts: StopDraft[] = (r.stops ?? []).map((s) => ({
          tempId: ++this.tempIdCounter,
          location: s.location
            ? ({
                id: s.location.id,
                name: s.location.name,
                type: s.location.type as any,
                province: s.location.province,
                region: s.location.region,
                latitude: s.location.latitude,
                longitude: s.location.longitude,
                isActive: true,
              } as Location)
            : null,
        }));

        this.stops.set(
          drafts.length >= 2
            ? drafts
            : [
                { tempId: ++this.tempIdCounter, location: null },
                { tempId: ++this.tempIdCounter, location: null },
              ],
        );
      },
      error: () => {
        this.notification.error('Route introuvable');
        this.router.navigate(['/routes']);
      },
    });
  }

  // ─── Actions sur les stops ───
  onLocationSelected(stopIndex: number, loc: Location): void {
    this.stops.update((list) =>
      list.map((s, i) => (i === stopIndex ? { ...s, location: loc } : s)),
    );
  }

  addStop(): void {
    if (!this.canAddStop()) return;
    this.stops.update((list) => {
      const last = list[list.length - 1];
      return [
        ...list.slice(0, -1),
        { tempId: ++this.tempIdCounter, location: null },
        last,
      ];
    });
  }

  removeStop(index: number): void {
    if (!this.canRemoveStop()) return;
    if (index === 0 || index === this.stops().length - 1) return;
    this.stops.update((list) => list.filter((_, i) => i !== index));
  }

  moveStopUp(index: number): void {
    if (index <= 1) return;
    this.stops.update((list) => {
      const copy = [...list];
      [copy[index - 1], copy[index]] = [copy[index], copy[index - 1]];
      return copy;
    });
  }

  moveStopDown(index: number): void {
    if (index >= this.stops().length - 2) return;
    this.stops.update((list) => {
      const copy = [...list];
      [copy[index], copy[index + 1]] = [copy[index + 1], copy[index]];
      return copy;
    });
  }

  // ═══════════════════════════════════════════════════════════
  // SUBMIT
  // ═══════════════════════════════════════════════════════════
  submit(): void {
    this.submitted.set(true);
    this.errorMessage.set(null);

    if (!this.moyenTransId()) {
      this.errorMessage.set('Sélectionnez un moyen de transport');
      return;
    }

    const stops = this.filledStops();
    if (stops.length < 2) {
      this.errorMessage.set('Au moins un départ et une arrivée requis');
      return;
    }

    for (const s of stops) {
      if (!s.location?.latitude || !s.location?.longitude) {
        this.errorMessage.set(
          `Le lieu "${s.location?.name}" n'a pas de coordonnées GPS`,
        );
        return;
      }
    }

    const ids = stops.map((s) => s.location!.id);
    if (new Set(ids).size !== ids.length) {
      this.errorMessage.set('Un lieu ne peut pas apparaître deux fois');
      return;
    }

    this.submitting.set(true);

    const firstLoc = stops[0].location!;
    const lastLoc = stops[stops.length - 1].location!;

    const payload = {
      nom: this.nom().trim() || undefined,
      moyenTransId: this.moyenTransId()!,
      dureeEstimee: this.dureeEstimee() ?? undefined,
      statut: this.statut(),
      description: this.description().trim() || undefined,
      depart: firstLoc.name,
      arrivee: lastLoc.name,
      distance: this.estimatedDistance() ?? undefined,
      stops: stops.map((s, idx) => ({
        locationId: s.location!.id,
        ordre: idx,
      })),
    };

    const request$ = this.isEdit()
      ? this.routesService.update(
          +this.route.snapshot.paramMap.get('id')!,
          payload,
        )
      : this.routesService.create(payload);

    request$.subscribe({
      next: () => {
        this.submitting.set(false);
        this.notification.success(
          this.isEdit() ? 'Route mise à jour' : 'Route créée avec succès',
        );
        this.router.navigate(['/routes']);
      },
      error: (err: any) => {
        this.submitting.set(false);
        this.errorMessage.set(
          err.error?.message ?? "Erreur lors de l'enregistrement",
        );
      },
    });
  }

  cancel(): void {
    this.router.navigate(['/routes']);
  }

  // ─── Helpers ───
  private haversineKm(
    lat1: number, lon1: number,
    lat2: number, lon2: number,
  ): number {
    const R = 6371;
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  statutLabel(s: RouteStatut): string {
    const labels: Record<RouteStatut, string> = {
      [RouteStatut.ACTIVE]: 'Active',
      [RouteStatut.INACTIVE]: 'Inactive',
      [RouteStatut.SUSPENDUE]: 'Suspendue',
    };
    return labels[s];
  }

  stopTypeLabel(index: number): string {
    if (index === 0) return 'Départ';
    if (index === this.stops().length - 1) return 'Arrivée';
    return `Étape ${index}`;
  }

  getRouteId(): number | null {
    const id = this.route.snapshot.paramMap.get('id');
    return id ? +id : null;
  }

  trackByStop(_: number, s: StopDraft): number {
    return s.tempId;
  }
}