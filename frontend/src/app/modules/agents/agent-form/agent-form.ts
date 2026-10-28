import { Component, inject, signal, output, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { AgentsService } from '../agents';
import { Agent, AgentType } from '../../../core/models/agent.model';

export type AgentCreateMode = 'ADMIN' | 'TEAM';

export interface AgentCreatedEvent {
  agent: Agent;
  emailSent: boolean | null;
  displayName: string;
}

@Component({
  selector: 'app-agent-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule],
  templateUrl: './agent-form.html',
  styleUrl: './agent-form.css',
})
export class AgentForm implements OnInit {
  private fb = inject(FormBuilder);
  private agentsService = inject(AgentsService);

  /**
   * ADMIN : crée uniquement un Directeur (avec mot de passe temporaire).
   * TEAM  : Directeur/Gérant ajoute un agent (jamais un Directeur),
   *         directement validé, mot de passe défini par l'agent via e-mail.
   */
  @Input() mode: AgentCreateMode = 'TEAM';

  created = output<AgentCreatedEvent>();
  cancelled = output<void>();

  loading = signal(false);
  errorMessage = signal<string | null>(null);

  readonly AgentType = AgentType;

  // Un Directeur n'est jamais proposé ici : seul l'admin en crée
  agentTypeOptions = [
    { value: AgentType.RECEPTIONNISTE, label: 'Réceptionniste' },
    { value: AgentType.CHAUFFEUR, label: 'Chauffeur' },
    { value: AgentType.CAISSIER, label: 'Caissier' },
    { value: AgentType.GERANT, label: 'Gérant' },
  ];

  form = this.fb.nonNullable.group({
    firstName: ['', [Validators.required]],
    lastName: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.required, Validators.pattern(/^\+?[0-9]{9,15}$/)]],
    CIN: ['', [Validators.required, Validators.minLength(8)]],
    address: ['', [Validators.required]],
    type: [AgentType.RECEPTIONNISTE as AgentType, [Validators.required]],
    // Utilisé uniquement en mode ADMIN
    password: [''],
  });

  get isAdminMode(): boolean {
    return this.mode === 'ADMIN';
  }

  get title(): string {
    return this.isAdminMode ? 'Ajouter un Directeur' : 'Ajouter un agent';
  }

  get subtitle(): string {
    return this.isAdminMode
      ? 'Créez le compte du Directeur d\'une société.'
      : "Le compte est créé directement validé et rattaché à votre société.";
  }

  ngOnInit(): void {
    if (this.isAdminMode) {
      this.form.controls.type.setValue(AgentType.DIRECTEUR);
      this.form.controls.password.setValidators([
        Validators.required,
        Validators.minLength(8),
      ]);
      this.form.controls.password.updateValueAndValidity();
    }
  }

  // ============================================================
  // HELPERS TEMPLATE
  // ============================================================
  invalid(name: string): boolean {
    const c = this.form.get(name);
    return !!c && c.invalid && (c.touched || c.dirty);
  }

  hasError(name: string, error: string): boolean {
    const c = this.form.get(name);
    return !!c && c.hasError(error) && (c.touched || c.dirty);
  }

  onBackdrop(): void {
    if (!this.loading()) this.cancelled.emit();
  }

  cancel(): void {
    if (!this.loading()) this.cancelled.emit();
  }

  // ============================================================
  // SOUMISSION
  // ============================================================
  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue();
    const base = {
      email: v.email.trim(),
      firstName: v.firstName.trim(),
      lastName: v.lastName.trim(),
      CIN: v.CIN.trim(),
      phone: v.phone.replace(/\s/g, ''),
      address: v.address.trim(),
    };
    const displayName = `${base.firstName} ${base.lastName}`;

    this.loading.set(true);
    this.errorMessage.set(null);

    if (this.isAdminMode) {
      this.agentsService
        .createDirecteur({ ...base, password: v.password, type: AgentType.DIRECTEUR })
        .subscribe({
          next: (agent) => this.onSuccess({ agent, emailSent: null, displayName }),
          error: (err: any) => this.onError(err),
        });
    } else {
      this.agentsService.createTeamAgent({ ...base, type: v.type }).subscribe({
        next: (res) =>
          this.onSuccess({ agent: res.agent, emailSent: res.emailSent, displayName }),
        error: (err: any) => this.onError(err),
      });
    }
  }

  private onSuccess(event: AgentCreatedEvent): void {
    this.loading.set(false);
    this.created.emit(event);
  }

  private onError(err: any): void {
    this.loading.set(false);
    const message = err?.error?.message;
    this.errorMessage.set(
      Array.isArray(message)
        ? message.join(', ')
        : message ?? "Impossible de créer l'agent.",
    );
  }
}