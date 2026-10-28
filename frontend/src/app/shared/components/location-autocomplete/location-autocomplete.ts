import {
  Component, Input, Output, EventEmitter, OnInit, OnDestroy,
  inject, signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormControl } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatIconModule } from '@angular/material/icon';
import {
  Subject, debounceTime, distinctUntilChanged, switchMap, of, catchError,
} from 'rxjs';

import { LocationsService } from '../../../modules/locations/locations';
import { Location, LocationType } from '../../../core/models/location.model';

@Component({
  selector: 'app-location-autocomplete',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule,
    MatFormFieldModule, MatInputModule, MatAutocompleteModule, MatIconModule,
  ],
  templateUrl: './location-autocomplete.html',
  styleUrl: './location-autocomplete.css',
})
export class LocationAutocomplete implements OnInit, OnDestroy {
  private locationsService = inject(LocationsService);

  @Input() label = 'Lieu';
  @Input() placeholder = 'Tapez au moins 2 lettres...';
  @Input() set value(loc: Location | null | undefined) {
    if (loc) {
      this.searchCtrl.setValue(loc, { emitEvent: false });
    } else {
      this.searchCtrl.setValue(null, { emitEvent: false });
    }
  }

  @Output() locationSelected = new EventEmitter<Location>();

  searchCtrl = new FormControl<string | Location | null>('');
  results = signal<Location[]>([]);
  loading = signal(false);

  private search$ = new Subject<string>();

  // ✅ Helper pour le template
  get searchQuery(): string {
    const v = this.searchCtrl.value;
    return typeof v === 'string' ? v : '';
  }

  // ═══════════════════════════════════════════════════════════
  // ngOnInit — UNE SEULE FOIS, avec toute la logique
  // ═══════════════════════════════════════════════════════════
  ngOnInit(): void {
    // Recherche debounced
    this.search$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((q) => {
          if (!q || q.trim().length < 2) {
            this.results.set([]);
            this.loading.set(false);
            return of([]);
          }
          this.loading.set(true);
          return this.locationsService.search(q.trim(), 10).pipe(
            catchError(() => of([])),
          );
        }),
      )
      .subscribe((list) => {
        this.results.set(list);
        this.loading.set(false);
      });

    this.searchCtrl.valueChanges.subscribe((v) => {
      // ✅ Si l'utilisateur efface → reset
      if (v === null || v === '') {
        this.locationSelected.emit(null as any);
        this.results.set([]);
        return;
      }

      // ✅ Si l'utilisateur tape du texte → recherche
      if (typeof v === 'string') {
        this.search$.next(v);
        return;
      }

      // ✅ Si c'est un objet Location → sélection valide
      // Rien à faire
    });
  }

  ngOnDestroy(): void {
    this.search$.complete();
  }

  onFocus(): void {
    const v = this.searchCtrl.value;
    if (typeof v === 'string' && v.length >= 2 && this.results().length === 0) {
      this.search$.next(v);
    }
  }

  displayFn(loc: Location | string | null): string {
    if (!loc) return '';
    if (typeof loc === 'string') return loc;
    return loc.name;
  }

  onSelect(loc: Location): void {
    // ✅ Force la valeur du contrôle à l'objet Location
    this.searchCtrl.setValue(loc, { emitEvent: false });
    this.locationSelected.emit(loc);
  }

  iconFor(type: LocationType): string {
    const icons: Record<LocationType, string> = {
      [LocationType.CITY]: 'location_city',
      [LocationType.VILLAGE]: 'holiday_village',
      [LocationType.STATION]: 'directions_bus',
      [LocationType.PORT]: 'anchor',
      [LocationType.AIRPORT]: 'flight',
      [LocationType.TRAINSTATION]: 'train',
      [LocationType.STOP]: 'place',
    };
    return icons[type] ?? 'place';
  }

  // ✅ Retourne la Location si elle est valide (objet), sinon null
  get currentLocation(): Location | null {
    const v = this.searchCtrl.value;
    if (v && typeof v === 'object' && 'id' in v) {
      return v as Location;
    }
    return null;
  }
}