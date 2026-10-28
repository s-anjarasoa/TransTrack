import { Component, inject, signal, OnDestroy } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Subscription } from 'rxjs';
import { AuthService, AuthResponse } from '../../../core/auth/auth'; // Vérifiez le chemin

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule, // ✅ Nécessaire pour le logo
    MatButtonModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login implements OnDestroy {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  loading = signal(false);
  errorMessage = signal<string | null>(null);
  showPassword = signal(false);

  private authSubscription: Subscription | null = null;

  form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  ngOnDestroy() {
    this.authSubscription?.unsubscribe();
  }

  togglePassword(): void {
    this.showPassword.update((value) => !value);
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);
    this.form.disable();

    this.authSubscription = this.authService.login(this.form.getRawValue()).subscribe({
      next: (res: AuthResponse) => {
        this.form.enable();
        this.loading.set(false);
        
        if (res.user.agentStatus === 'EN_ATTENTE' || res.user.agentStatus === 'PRE_VALIDE') {
          this.router.navigate(['/auth/agent-code']);
        } else if (!res.user.profileCompleted) {
          this.router.navigate(['/auth/complete-profile']);
        } else {
          this.router.navigate(['/dashboard']);
        }
      },
      error: (err: any) => {
        this.form.enable();
        this.loading.set(false);
        this.errorMessage.set(
          err.error?.message ?? 'Email ou mot de passe incorrect. Veuillez réessayer.',
        );
      },
    });
  }
}