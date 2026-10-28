import { Component, inject, signal, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { AuthService } from '../../../../core/auth/auth';

@Component({
  selector: 'app-client-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './client-form.html',
  styleUrl: './client-form.css',
})
export class ClientForm {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);

  // Outputs
  completed = output<void>();

  // State
  loading = signal(false);
  errorMessage = signal<string | null>(null);

  // Formulaire
  form = this.fb.nonNullable.group({
    phone: ['', [Validators.required]],
    address: ['', [Validators.required]],
    CIN: ['', [Validators.required, Validators.minLength(8)]],
    passport: ['', [Validators.required]],
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);
    this.form.disable();

    this.authService.completeClientProfile(this.form.getRawValue()).subscribe({
      next: () => {
        this.loading.set(false);
        this.completed.emit();
      },
      error: (err) => {
        this.loading.set(false);
        this.form.enable();
        this.errorMessage.set(err.error?.message ?? 'Erreur lors de la complétion');
      },
    });
  }
}