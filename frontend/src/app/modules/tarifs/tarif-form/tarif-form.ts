import { Component, inject, signal, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { TarifsService } from '../tarifs';
import { RoutesService } from '../../routes-trajet/routes-trajet';
import { Route } from '../../../core/models/route.model';
import { TarifCategorie } from '../../../core/models/tarif.model';
import { NotificationService } from '../../../core/services/notification';
import { MatIconModule } from '@angular/material/icon';

function prixPromoValidator(group: AbstractControl): ValidationErrors | null {
  const prix = group.get('prix')?.value;
  const prixPromo = group.get('prixPromo')?.value;
  if (prixPromo == null || prixPromo === '') return null;
  return Number(prixPromo) < Number(prix) ? null : { promoTooHigh: true };
}

@Component({
  selector: 'app-tarif-form',
  standalone: true,
  imports: [ReactiveFormsModule, MatIconModule],
  templateUrl: './tarif-form.html',
  styleUrl: './tarif-form.css',
})
export class TarifForm implements OnInit {
  private fb = inject(FormBuilder);
  private tarifsService = inject(TarifsService);
  private routesService = inject(RoutesService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private notification = inject(NotificationService);

  loading = signal(false);
  checking = signal(true);
  errorMessage = signal<string | null>(null);
  isEditMode = signal(false);
  tarifId = signal<number | null>(null);
  routes = signal<Route[]>([]);

  categorieOptions = Object.values(TarifCategorie);

  form = this.fb.nonNullable.group(
    {
      categorie: [TarifCategorie.ECONOMIE, [Validators.required]], 
      prix: [0, [Validators.required, Validators.min(1)]],
      prixPromo: [null as number | null],
      dateDebut: [''],
      dateFin: [''],
      routeId: [null as number | null, [Validators.required]],
    },
    { validators: prixPromoValidator },
  );

  ngOnInit(): void {
    this.routesService.findMine({ limit: 100 }).subscribe({
      next: (res) => this.routes.set(res.data),
      error: () => this.notification.error('Impossible de charger les routes associées.'),
    });

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode.set(true);
      this.tarifId.set(Number(id));
      this.tarifsService.findOne(Number(id)).subscribe({
        next: (t) => {
          this.form.patchValue({
            categorie: t.categorie,
            prix: t.prix,
            prixPromo: t.prixPromo ?? null,
            dateDebut: t.dateDebut ? t.dateDebut.slice(0, 10) : '',
            dateFin: t.dateFin ? t.dateFin.slice(0, 10) : '',
            routeId: t.routeId,
          });
          this.form.get('routeId')?.disable();
          this.checking.set(false);
        },
        error: () => {
          this.checking.set(false);
          const msg = 'Impossible de charger ce tarif';
          this.errorMessage.set(msg);
          this.notification.error(msg);
        },
      });
    } else {
      this.checking.set(false);
    }
  }

  categorieLabel(cat: TarifCategorie): string {
    const labels: Record<TarifCategorie, string> = {
      [TarifCategorie.CLASSE]: 'Classe / VIP',
      [TarifCategorie.ECONOMIE]: 'Économie',
    };
    return labels[cat] ?? cat;
  }

  cancel(): void {
    this.router.navigate(['/tarifs']);
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.notification.warning('Veuillez remplir correctement tous les champs obligatoires.');
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);
    const payload = this.form.getRawValue();

    const request = this.isEditMode() && this.tarifId()
      ? this.tarifsService.update(this.tarifId()!, payload as any)
      : this.tarifsService.create(payload as any);

    request.subscribe({
      next: () => {
        this.loading.set(false);
        const actionMsg = this.isEditMode() ? 'Tarif mis à jour avec succès' : 'Tarif créé avec succès';
        this.notification.success(actionMsg);
        this.router.navigate(['/tarifs']);
      },
      error: (err) => {
        this.loading.set(false);
        const errorMsg = err.error?.message ?? 'Une erreur est survenue.';
        this.errorMessage.set(errorMsg);
        this.notification.error(errorMsg);
      },
    });
  }
}