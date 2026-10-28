import { Component, inject, signal } from '@angular/core';
import {
  ReactiveFormsModule,
  FormBuilder,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth';
import { AgentType } from '../../../core/models/agent.model';

function passwordsMatchValidator(group: AbstractControl): ValidationErrors | null {
  const password = group.get('password')?.value;
  const confirmPassword = group.get('confirmPassword')?.value;
  return password === confirmPassword ? null : { passwordMismatch: true };
}

@Component({
  selector: 'app-register-agent',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register-agent.html',
  styleUrl: './register-agent.css',
})
export class RegisterAgent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);

  loading = signal(false);
  success = signal(false);
  successMessage = signal('');
  errorMessage = signal<string | null>(null);
  showPassword = signal(false);
  showConfirmPassword = signal(false);

  // DIRECTEUR volontairement exclu — réservé à la création par l'Admin
  agentTypes: { value: AgentType; label: string }[] = [
    { value: AgentType.RECEPTIONNISTE, label: 'Réceptionniste' },
    { value: AgentType.CHAUFFEUR, label: 'Chauffeur' },
    { value: AgentType.CAISSIER, label: 'Caissier' },
    { value: AgentType.GERANT, label: 'Gérant' },
  ];

  form = this.fb.nonNullable.group(
    {
      firstName: ['', [Validators.required]],
      lastName: ['', [Validators.required]],
      phone: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]],
      address: ['', [Validators.required]],
      CIN: ['', [Validators.required, Validators.minLength(8)]],
      type: [AgentType.RECEPTIONNISTE, [Validators.required]],
      invitationCode: ['', [Validators.required]],
    },
    { validators: passwordsMatchValidator },
  );

  togglePassword(): void {
    this.showPassword.update((v) => !v);
  }

  toggleConfirmPassword(): void {
    this.showConfirmPassword.update((v) => !v);
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    const { confirmPassword, ...payload } = this.form.getRawValue();

    this.authService.registerAgent(payload).subscribe({
      next: (res) => {
        this.loading.set(false);
        this.success.set(true);
        this.successMessage.set(res.message);
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set(
          err.error?.message ?? 'Une erreur est survenue. Vérifiez le code d\'invitation.',
        );
      },
    });
  }
}