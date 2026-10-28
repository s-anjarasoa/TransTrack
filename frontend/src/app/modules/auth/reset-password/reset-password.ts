import { Component, inject, signal, OnInit } from '@angular/core';
import {
  ReactiveFormsModule,
  FormBuilder,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth';

// ✅ IMPORT DU MODULE MATERIAL
import { MatIconModule } from '@angular/material/icon';

function passwordsMatchValidator(group: AbstractControl): ValidationErrors | null {
  const password = group.get('password')?.value;
  const confirmPassword = group.get('confirmPassword')?.value;
  return password === confirmPassword ? null : { passwordMismatch: true };
}

@Component({
  selector: 'app-reset-password',
  standalone: true,
  // ✅ AJOUT DANS LES IMPORTS
  imports: [ReactiveFormsModule, RouterLink, MatIconModule],
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.css', // Assurez-vous que le nom du fichier CSS correspond
})
export class ResetPassword implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  loading = signal(false);
  checkingToken = signal(true);
  tokenValid = signal(false);
  success = signal(false);
  errorMessage = signal<string | null>(null);
  showPassword = signal(false);

  private token = '';

  form = this.fb.nonNullable.group(
    {
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: passwordsMatchValidator },
  );

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token') ?? '';

    if (!this.token) {
      this.checkingToken.set(false);
      this.tokenValid.set(false);
      return;
    }

    this.authService.validateResetToken(this.token).subscribe({
      next: (res) => {
        this.checkingToken.set(false);
        this.tokenValid.set(res.valid);
      },
      error: () => {
        this.checkingToken.set(false);
        this.tokenValid.set(false);
      },
    });
  }

  togglePassword(): void {
    this.showPassword.update((v) => !v);
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    this.authService.resetPassword(this.token, this.form.getRawValue().password).subscribe({
      next: () => {
        this.loading.set(false);
        this.success.set(true);
        setTimeout(() => this.router.navigate(['/auth/login']), 2500);
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set(
          err.error?.message ?? 'Le lien a expiré ou est invalide.',
        );
      },
    });
  }
}