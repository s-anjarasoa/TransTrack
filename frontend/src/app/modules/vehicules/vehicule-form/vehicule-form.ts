import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { VehiculesService } from '../vehicules';
import { MoyensTransService } from '../../moyens-trans/moyens-trans';
import { MoyenTrans } from '../../../core/models/moyen-trans.model';
import { NotificationService } from '../../../core/services/notification';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-vehicule-form',
  standalone: true,
  imports: [ReactiveFormsModule, MatIconModule],
  templateUrl: './vehicule-form.html',
  styleUrl: './vehicule-form.css',
})
export class VehiculeForm implements OnInit {
  private fb = inject(FormBuilder);
  private vehiculesService = inject(VehiculesService);
  private moyensTransService = inject(MoyensTransService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private notification = inject(NotificationService);

  loading = signal(false);
  checking = signal(true);
  errorMessage = signal<string | null>(null);
  isEditMode = signal(false);
  vehiculeId = signal<number | null>(null);
  moyensTrans = signal<MoyenTrans[]>([]);

  form = this.fb.nonNullable.group({
    immatriculation: ['', [Validators.required]],
    marque: ['', [Validators.required]],
    modele: ['', [Validators.required]],
    annee: [null as number | null],
    capacite: [1, [Validators.required, Validators.min(1)]],
    couleur: [''],
    numeroChassis: [''],
    dateAssurance: [''],
    dateVisiteTechnique: [''],
    moyenTransId: [null as number | null, [Validators.required]],
  });

  // ✅ Computed : moyen de transport actuellement sélectionné
  selectedMoyenTrans = computed(() => {
    const id = this.form.get('moyenTransId')?.value;
    if (!id) return null;
    return this.moyensTrans().find((mt) => mt.id === Number(id)) ?? null;
  });

  ngOnInit(): void {
    this.moyensTransService.findAll({ limit: 100 }).subscribe({
      next: (res: any) => {
        const items = Array.isArray(res) ? res : (res?.data ?? []);
        this.moyensTrans.set(items);
      },
      error: () => {
        const msg = 'Impossible de charger les moyens de transport.';
        this.errorMessage.set(msg);
        this.notification.error(msg);
      },
    });

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode.set(true);
      this.vehiculeId.set(Number(id));
      this.vehiculesService.findOne(Number(id)).subscribe({
        next: (v) => {
          this.form.patchValue({
            immatriculation: v.immatriculation,
            marque: v.marque,
            modele: v.modele,
            annee: v.annee ?? null,
            capacite: v.capacite,
            couleur: v.couleur ?? '',
            numeroChassis: v.numeroChassis ?? '',
            dateAssurance: v.dateAssurance
              ? v.dateAssurance.slice(0, 10)
              : '',
            dateVisiteTechnique: v.dateVisiteTechnique
              ? v.dateVisiteTechnique.slice(0, 10)
              : '',
            moyenTransId: v.moyenTransId,
          });
          this.checking.set(false);
        },
        error: () => {
          this.checking.set(false);
          const msg = 'Impossible de charger ce véhicule.';
          this.errorMessage.set(msg);
          this.notification.error(msg);
        },
      });
    } else {
      this.checking.set(false);
    }
  }

  cancel(): void {
    this.router.navigate(['/vehicules']);
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.notification.warning(
        'Veuillez remplir correctement tous les champs obligatoires.',
      );
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);
    const payload: any = this.form.getRawValue();

    const request =
      this.isEditMode() && this.vehiculeId()
        ? this.vehiculesService.update(this.vehiculeId()!, payload)
        : this.vehiculesService.create(payload as any);

    request.subscribe({
      next: () => {
        this.loading.set(false);
        const actionMsg = this.isEditMode()
          ? 'Véhicule mis à jour avec succès'
          : 'Véhicule créé avec succès';
        this.notification.success(actionMsg);
        this.router.navigate(['/vehicules']);
      },
      error: (err) => {
        this.loading.set(false);
        const errorMsg = err.error?.message ?? 'Une erreur est survenue.';
        this.errorMessage.set(errorMsg);
        this.notification.error(errorMsg);
      },
    });
  }

  // ============================================================
  // ✅ HELPERS
  // ============================================================

  /**
   * Vérifie si une date est déjà passée
   */
  isDatePassee(dateStr: string | null | undefined): boolean {
    if (!dateStr) return false;
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  }

  /**
   * Retourne l'icône Material associée au type de moyen de transport
   */
  getMoyenTransIcon(nom?: string, type?: string): string {
    const source = `${nom ?? ''} ${type ?? ''}`.toLowerCase();

    if (source.includes('bus')) return 'directions_bus';
    if (source.includes('train')) return 'train';
    if (source.includes('avion') || source.includes('air')) return 'flight';
    if (source.includes('bateau') || source.includes('ferry'))
      return 'directions_boat';
    if (source.includes('taxi')) return 'local_taxi';
    if (source.includes('camion')) return 'local_shipping';

    return 'commute';
  }
}