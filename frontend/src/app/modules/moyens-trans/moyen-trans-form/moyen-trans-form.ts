import { Component, inject, signal, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router,ActivatedRoute } from '@angular/router';
import { MoyensTransService } from '../moyens-trans';
import { MoyenTransType } from '../../../core/models/moyen-trans.model';
import { NotificationService } from '../../../core/services/notification';

@Component({
  selector: 'app-moyen-trans-form',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './moyen-trans-form.html',
  styleUrl: './moyen-trans-form.css',
})
export class MoyenTransForm implements OnInit {
  private fb = inject(FormBuilder);
  private moyensTransService = inject(MoyensTransService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private notification = inject(NotificationService);

  loading = signal(false);
  checking = signal(true);
  errorMessage = signal<string | null>(null);
  isEditMode = signal(false);
  itemId = signal<number | null>(null);

  typeOptions = Object.values(MoyenTransType);

  form = this.fb.nonNullable.group({
    type: [MoyenTransType.BUS, [Validators.required]],
    nom: ['', [Validators.required]],
    description: [''],
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode.set(true);
      this.itemId.set(Number(id));
      this.moyensTransService.findOne(Number(id)).subscribe({
        next: (item) => {
          this.form.patchValue({
            type: item.type,
            nom: item.nom,
            description: item.description ?? '',
          });
          this.checking.set(false);
        },
        error: () => {
          this.checking.set(false);
          const msg = 'Impossible de charger cet élément';
          this.errorMessage.set(msg);
          this.notification.error(msg);
        },
      });
    } else {
      this.checking.set(false);
    }
  }

  typeLabel(type: MoyenTransType): string {
    const labels: Record<MoyenTransType, string> = {
      [MoyenTransType.BUS]: 'Bus',
      [MoyenTransType.TRAIN]: 'Train',
      [MoyenTransType.BATEAU]: 'Bateau',
      [MoyenTransType.AVION]: 'Avion',
      [MoyenTransType.TAXI]: 'Taxi',
      [MoyenTransType.TAXI_BROUSSE]: 'Taxi-brousse',
      [MoyenTransType.FERRY]: 'Ferry',
      [MoyenTransType.CAMION]: 'Camion',
    };
    return labels[type] ?? type;
  }

  cancel(): void {
    this.router.navigate(['/moyens-trans']);
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

    const request = this.isEditMode() && this.itemId()
      ? this.moyensTransService.update(this.itemId()!, payload)
      : this.moyensTransService.create(payload);

    request.subscribe({
      next: () => {
        this.loading.set(false);
        const actionMsg = this.isEditMode() ? 'Moyen de transport mis à jour' : 'Moyen de transport créé';
        this.notification.success(actionMsg);
        this.router.navigate(['/moyens-trans']);
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