import { Component, inject, signal, output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { AuthService } from '../../../../core/auth/auth';
import { SocietesService } from '../../../societes/societes';
import { NotificationService } from '../../../../core/services/notification';
import { Societe } from '../../../../core/models/societe.model';
import { AgentType } from '../../../../core/models/agent.model';

@Component({
  selector: 'app-agent-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './agent-form.html',
  styleUrl: './agent-form.css',
})
export class AgentForm implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private societesService = inject(SocietesService);
  private notification = inject(NotificationService);

  // Outputs : la navigation est gérée par le composant parent (CompleteProfile)
  requestSent = output<void>();
  errorOccurred = output<string>();

  // State
  loading = signal(false);
  loadingSocietes = signal(false);
  societes = signal<Societe[]>([]);

  agentTypeOptions = [
    { value: AgentType.RECEPTIONNISTE, label: 'Réceptionniste' },
    { value: AgentType.CHAUFFEUR, label: 'Chauffeur' },
    { value: AgentType.CAISSIER, label: 'Caissier' },
    { value: AgentType.GERANT, label: 'Gérant' },
  ];

  form = this.fb.nonNullable.group({
    phone: [
      '',
      [Validators.required, Validators.pattern(/^\+?[0-9]{9,15}$/)],
    ],
    address: ['', [Validators.required]],
    CIN: ['', [Validators.required, Validators.minLength(8)]],
    type: [AgentType.RECEPTIONNISTE, [Validators.required]],
    societeId: [null as number | null, [Validators.required]],
  });

  ngOnInit(): void {
    this.loadSocietes();
  }

  // ============================================================
  // CHARGEMENT DES SOCIÉTÉS
  // ============================================================
  private loadSocietes(): void {
    this.loadingSocietes.set(true);
    this.societesService.findAllPublic({ limit: 100 }).subscribe({
      next: (res) => {
        this.societes.set(res.data || []);
        this.loadingSocietes.set(false);
      },
      error: (err: any) => {
        console.error('❌ Erreur chargement sociétés:', err);
        this.notification.error('Impossible de charger les sociétés');
        this.loadingSocietes.set(false);
      },
    });
  }

  // ============================================================
  // SOUMISSION
  // ============================================================
  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const formValue = this.form.getRawValue();

    if (!formValue.societeId) {
      this.errorOccurred.emit('Veuillez choisir une société');
      return;
    }

    const payload = {
      phone: formValue.phone.replace(/\s/g, ''),
      address: formValue.address.trim(),
      CIN: formValue.CIN.trim(),
      type: formValue.type,
      societeId: formValue.societeId,
    };

    this.loading.set(true);
    this.form.disable();

    this.authService.requestAgentInvitation(payload).subscribe({
      next: () => {
        this.loading.set(false);
        // Le parent affiche la confirmation et redirige vers /auth/agent-code
        this.requestSent.emit();
      },
      error: (err: any) => {
        console.error('❌ Erreur API:', err);
        this.loading.set(false);
        this.form.enable();
        this.errorOccurred.emit(
          err.error?.message
            ? Array.isArray(err.error.message)
              ? err.error.message.join(', ')
              : err.error.message
            : "Erreur lors de l'envoi",
        );
      },
    });
  }
}