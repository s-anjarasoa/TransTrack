import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop'; // ✅ INDISPENSABLE
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { DecimalPipe } from '@angular/common';
import { VoyagesService } from '../voyages';
import { RoutesService } from '../../routes-trajet/routes-trajet';
import { VehiculesService } from '../../vehicules/vehicules';
import { AgentsService } from '../../agents/agents';
import { TarifsService } from '../../tarifs/tarifs';
import { NotificationService } from '../../../core/services/notification';
import { Route } from '../../../core/models/route.model';
import { Vehicule } from '../../../core/models/vehicule.model';
import { MoyenTransType } from '../../../core/models/moyen-trans.model';
import { Tarif, TarifCategorie, TarifType } from '../../../core/models/tarif.model';

@Component({
  selector: 'app-voyage-form',
  standalone: true,
  imports: [ReactiveFormsModule, MatIconModule, DecimalPipe],
  templateUrl: './voyage-form.html',
  styleUrl: './voyage-form.css',
})
export class VoyageForm implements OnInit {
  private fb = inject(FormBuilder);
  private voyagesService = inject(VoyagesService);
  private routesService = inject(RoutesService);
  private vehiculesService = inject(VehiculesService);
  private agentsService = inject(AgentsService);
  private tarifsService = inject(TarifsService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private notification = inject(NotificationService);

  submitting = signal(false);
  isEditMode = signal(false);
  voyageId = signal<number | null>(null);
  
  routes = signal<Route[]>([]);
  vehicules = signal<Vehicule[]>([]);
  chauffeurs = signal<any[]>([]);
  tarifsRoute = signal<Tarif[]>([]);

  typeFilter = signal<MoyenTransType | ''>('');
  typeOptions = Object.values(MoyenTransType);

  form = this.fb.nonNullable.group({
    routeId: [null as number | null, Validators.required],
    vehiculeId: [null as number | null, Validators.required],
    chauffeurId: [null as number | null],
    dateDepart: ['', Validators.required],
    dateArrivee: ['', Validators.required],
    modeTarification: ['ECONOMIE' as 'CLASSE' | 'ECONOMIE' | 'MIXTE', Validators.required],
    placesClasse: [0],
    notes: ['']
  });

  // ✅ On transforme les changements du formulaire en Signal pour que l'UI réagisse
  private formValue = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });

  // ✅ On utilise formValue() dans les computed pour forcer la mise à jour
  selectedRoute = computed(() => {
    const rId = this.formValue().routeId;
    if (!rId) return null;
    return this.routes().find(r => r.id == Number(rId)) || null;
  });

  selectedVehicule = computed(() => {
    const vId = this.formValue().vehiculeId;
    if (!vId) return null;
    return this.vehicules().find(v => v.id == Number(vId)) || null;
  });

  routesFiltrees = computed(() => {
    const type = this.typeFilter();
    if (!type) return this.routes();
    return this.routes().filter((r) => {
      const t = r.moyenTrans?.type ?? (r as any).moyenTransType;
      return t === type;
    });
  });

  filteredVehicules = computed(() => {
    const r = this.selectedRoute();
    if (!r) return this.vehicules();
    return this.vehicules().filter(v => v.moyenTransId == r.moyenTransId);
  });

  isMixteAllowed = computed(() => {
    const type = this.selectedRoute()?.moyenTrans?.type || (this.selectedRoute() as any)?.moyenTransType;
    return ['AVION', 'TRAIN', 'BATEAU', 'FERRY'].includes(type);
  });

  isModeMixte = computed(() => this.formValue().modeTarification === 'MIXTE');

  tarifClasse = computed(() => this.tarifsRoute().find(t => t.categorie === TarifCategorie.CLASSE));
  tarifEconomie = computed(() => this.tarifsRoute().find(t => t.categorie === TarifCategorie.ECONOMIE));

  categorieOptions = computed(() => {
    const options: { value: string; label: string }[] = [];
    
    if (this.tarifEconomie()) options.push({ value: 'ECONOMIE', label: 'Économie' });
    if (this.tarifClasse()) options.push({ value: 'CLASSE', label: 'Classe / VIP' });
    
    if (this.isMixteAllowed() && this.tarifClasse() && this.tarifEconomie()) {
      options.push({ value: 'MIXTE', label: 'Mixte (Classe + Économie)' });
    }
    
    return options;
  });

  prixActuel = computed(() => {
    const mode = this.formValue().modeTarification;
    const dateStr = this.formValue().dateDepart;
    if (!dateStr) return 0;

    const dateDepart = new Date(dateStr);
    let tarifCible: Tarif | undefined;

    if (mode === 'CLASSE') tarifCible = this.tarifClasse();
    else if (mode === 'ECONOMIE') tarifCible = this.tarifEconomie();
    else return 0; // Mixte a deux prix

    if (!tarifCible) return 0;

    if (tarifCible.type === TarifType.PROMOTION && tarifCible.prixPromo && tarifCible.dateDebut && tarifCible.dateFin) {
      const debut = new Date(tarifCible.dateDebut);
      const fin = new Date(tarifCible.dateFin);
      fin.setHours(23, 59, 59, 999);
      if (dateDepart >= debut && dateDepart <= fin) {
        return Number(tarifCible.prixPromo);
      }
    }
    return Number(tarifCible.prix);
  });

  isPromoActive = computed(() => {
    const mode = this.formValue().modeTarification;
    const dateStr = this.formValue().dateDepart;
    if (!dateStr) return false;

    const dateDepart = new Date(dateStr);
    let tarifCible: Tarif | undefined;

    if (mode === 'CLASSE') tarifCible = this.tarifClasse();
    else if (mode === 'ECONOMIE') tarifCible = this.tarifEconomie();

    if (tarifCible && tarifCible.type === TarifType.PROMOTION && tarifCible.dateDebut && tarifCible.dateFin) {
      const debut = new Date(tarifCible.dateDebut);
      const fin = new Date(tarifCible.dateFin);
      fin.setHours(23, 59, 59, 999);
      return dateDepart >= debut && dateDepart <= fin;
    }
    return false;
  });

  ngOnInit(): void {
    this.routesService.findMine({ limit: 100 }).subscribe(res => this.routes.set(res.data));
    this.vehiculesService.findAll({ limit: 100 }).subscribe(res => this.vehicules.set(res.data));
    this.agentsService.findAll({ type: 'CHAUFFEUR', limit: 100 }).subscribe((res: any) => this.chauffeurs.set(res.data));

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode.set(true);
      this.voyageId.set(+id);
      this.voyagesService.findOne(+id).subscribe({
        next: (v) => {
          this.form.patchValue({
            routeId: v.routeId,
            vehiculeId: v.vehiculeId,
            chauffeurId: v.chauffeurId || null,
            dateDepart: v.dateDepart.slice(0, 16),
            dateArrivee: v.dateArrivee.slice(0, 16),
            modeTarification: (v as any).modeTarification || 'ECONOMIE',
            placesClasse: v.placesClasseTotales || 0,
            notes: v.notes || ''
          });
          this.loadTarifs(v.routeId);
        }
      });
    }

    this.form.get('routeId')?.valueChanges.subscribe((routeId) => {
      this.loadTarifs(Number(routeId));
      if (!this.isEditMode()) {
        this.form.get('vehiculeId')?.setValue(null);
      }
    });

    this.form.get('modeTarification')?.valueChanges.subscribe((mode) => {
      const v = this.selectedVehicule();
      if (mode === 'MIXTE' && v) {
        this.form.get('placesClasse')?.setValue(Math.floor(v.capacite * 0.3));
      } else {
        this.form.get('placesClasse')?.setValue(0);
      }
    });
  }

  private loadTarifs(routeId: number): void {
    if (!routeId) {
      this.tarifsRoute.set([]);
      return;
    }
    this.tarifsService.findAll({ routeId, limit: 10 }).subscribe({
      next: (res) => {
        this.tarifsRoute.set(res.data);
        const options = this.categorieOptions().map(o => o.value);
        if (!options.includes(this.form.get('modeTarification')?.value || '')) {
          this.form.get('modeTarification')?.setValue(options[0] as any || 'ECONOMIE');
        }
      },
      error: () => this.tarifsRoute.set([])
    });
  }

  setTypeFilter(event: Event): void {
    const value = (event.target as HTMLSelectElement).value as MoyenTransType | '';
    this.typeFilter.set(value);
    this.form.get('routeId')?.setValue(null);
    this.form.get('vehiculeId')?.setValue(null);
  }

  typeLabel(type: MoyenTransType): string {
    const labels: Record<MoyenTransType, string> = {
      BUS: 'Bus', TRAIN: 'Train', BATEAU: 'Bateau', AVION: 'Avion',
      TAXI: 'Taxi', TAXI_BROUSSE: 'Taxi-brousse', FERRY: 'Ferry', CAMION: 'Camion',
    };
    return labels[type] ?? type;
  }

    submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    const raw = this.form.getRawValue();

    // ✅ On construit le payload complet
    const payload: any = {
      dateDepart: raw.dateDepart,
      dateArrivee: raw.dateArrivee,
      notes: raw.notes || undefined,
      routeId: Number(raw.routeId),      // ✅ Toujours envoyé
      vehiculeId: Number(raw.vehiculeId), // ✅ Toujours envoyé
      modeTarification: raw.modeTarification,
    };

    if (raw.modeTarification === 'MIXTE') {
      payload.placesClasse = Number(raw.placesClasse);
    }

    if (raw.chauffeurId) {
      payload.chauffeurId = Number(raw.chauffeurId);
    }

    const request$ = this.isEditMode()
      ? this.voyagesService.update(this.voyageId()!, payload)
      : this.voyagesService.create(payload);

    request$.subscribe({
      next: () => {
        this.submitting.set(false);
        this.notification.success(this.isEditMode() ? 'Voyage mis à jour' : 'Voyage planifié avec succès');
        this.router.navigate(['/voyages']);
      },
      error: (err) => {
        this.submitting.set(false);
        this.notification.error(err.error?.message ?? 'Erreur lors de l\'enregistrement');
      }
    });
  }
  // ✅ CORRECTION DE LA ROUTE ICI
  cancel() { this.router.navigate(['/voyages']); }
}