import { Component, inject, signal, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ClientsService } from '../clients';
import { AuthService } from '../../../core/auth/auth';

@Component({
  selector: 'app-client-profile',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './client-profile.html',
  styleUrl: './client-profile.css',
})
export class ClientProfile implements OnInit {
  private fb = inject(FormBuilder);
  private clientsService = inject(ClientsService);
  private authService = inject(AuthService);

  loading = signal(false);
  checking = signal(true);
  hasProfile = signal(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  form = this.fb.nonNullable.group({
    address: ['', [Validators.required, Validators.minLength(5)]],
    CIN: ['', [Validators.required, Validators.pattern('^[0-9]{12}$')]], // Exemple: validation 12 chiffres
    passport: [''],
  });

  get userName(): string {
    const u = this.authService.currentUser;
    return u ? `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || u.email : '';
  }

  get userEmail(): string {
    return this.authService.currentUser?.email ?? '';
  }

  ngOnInit(): void {
    this.clientsService.me().subscribe({
      next: (client) => {
        this.hasProfile.set(true);
        this.form.patchValue({
          address: client.address,
          CIN: client.CIN,
          passport: client.passport,
        });
        this.checking.set(false);
      },
      error: () => {
        this.hasProfile.set(false);
        this.checking.set(false);
      },
    });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const payload = this.form.getRawValue();
    const request = this.hasProfile()
    
      ? this.clientsService.updateMe(payload)
      : this.clientsService.createMe(payload);

    request.subscribe({
      next: () => {
        this.loading.set(false);
        this.hasProfile.set(true);
        this.successMessage.set('Informations de profil enregistrées avec succès.');
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set(err.error?.message ?? 'Une erreur est survenue lors de l’enregistrement.');
      },
    });
  }
}