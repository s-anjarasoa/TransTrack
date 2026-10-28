import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { EMPTY, interval, Subscription, switchMap, catchError } from 'rxjs';

import { AuthService } from '../../../core/auth/auth';
import { NotificationService } from '../../../core/services/notification';

@Component({
  selector: 'app-agent-code',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './agent-code.html',
  styleUrl: './agent-code.css',
})
export class AgentCode implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private notification = inject(NotificationService);
  private router = inject(Router);

  // ============================================================
  // STATE
  // ============================================================
  loading = signal(false);
  loadingSociete = signal(true);
  errorMessage = signal<string | null>(null);
  societeName = signal<string | null>(null);
  hasCode = signal(false);
  rejected = signal(false);
  codeExpiresAt = signal<Date | null>(null);
  remainingSeconds = signal(0);
  codeExpired = signal(false);

  private pollingSubscription: Subscription | null = null;
  private timerSubscription: Subscription | null = null;

  // ============================================================
  // FORMULAIRE : code à 6 chiffres
  // ============================================================
  codeForm = this.fb.nonNullable.group({
    code: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
  });

  // ============================================================
  // LIFECYCLE
  // ============================================================
  ngOnInit(): void {
    this.loadStatus();
    this.startPolling();
  }

  ngOnDestroy(): void {
    this.stopPolling();
    this.stopTimer();
  }

  // ============================================================
  // STATUT (appel unique, puis polling tant que le code n'est pas arrivé)
  // ============================================================
  private loadStatus(): void {
    this.authService.getAgentInvitationStatus().subscribe({
      next: (status: any) => this.applyStatus(status, false),
      error: (err: any) => {
        console.error('❌ Erreur statut:', err);
        this.loadingSociete.set(false);
      },
    });
  }

  private startPolling(): void {
    this.stopPolling();
    this.pollingSubscription = interval(2000)
      .pipe(
        switchMap(() =>
          this.authService
            .getAgentInvitationStatus()
            .pipe(catchError(() => EMPTY)),
        ),
      )
      .subscribe((status: any) => this.applyStatus(status, true));
  }

  private stopPolling(): void {
    this.pollingSubscription?.unsubscribe();
    this.pollingSubscription = null;
  }

  /** Applique la réponse du serveur à l'écran */
  private applyStatus(status: any, fromPolling: boolean): void {
    this.societeName.set(status.societeName ?? null);
    this.loadingSociete.set(false);

    // Aucune demande agent : retour au formulaire de profil
    if (!status.hasAgent) {
      this.stopPolling();
      // ⚠️ Adapte cette route à ton app.routes.ts
      this.router.navigate(['/auth/complete-profile']);
      return;
    }

    if (status.status === 'VALIDE') {
      this.stopPolling();
      this.stopTimer();
      this.notification.success('Votre compte est validé !');
      // ✅ Le rôle est passé de PENDING à AGENT côté serveur :
      // on recharge l'utilisateur local avant de rediriger.
      this.authService.fetchMe().subscribe({
        next: () => this.router.navigate(['/dashboard']),
        error: () => this.router.navigate(['/auth/login']),
      });
      return;
    }

    if (status.status === 'REJETE') {
      this.stopPolling();
      this.stopTimer();
      this.hasCode.set(false);
      this.rejected.set(true);
      return;
    }

    if (status.hasCode) {
      const firstTime = !this.hasCode();
      this.hasCode.set(true);
      this.setExpiry(status);
      this.stopPolling(); // le code est arrivé : plus besoin d'interroger

      if (firstTime && fromPolling) {
        this.notification.success(
          "🔑 Votre code d'invitation est arrivé ! Vérifiez votre email.",
        );
      }
    }
  }

  // ============================================================
  // CHRONOMÈTRE (basé sur la durée restante donnée par le serveur,
  // ce qui évite les écarts d'horloge avec le navigateur)
  // ============================================================
  private setExpiry(status: any): void {
    let seconds: number;
    if (typeof status.expiresInSeconds === 'number') {
      seconds = status.expiresInSeconds;
    } else if (status.expiresAt) {
      seconds = Math.max(
        0,
        Math.ceil((new Date(status.expiresAt).getTime() - Date.now()) / 1000),
      );
    } else {
      seconds = 0;
    }

    this.codeExpiresAt.set(new Date(Date.now() + seconds * 1000));
    this.remainingSeconds.set(seconds);
    this.codeExpired.set(seconds <= 0);

    if (seconds > 0) {
      this.startTimer();
    } else {
      this.stopTimer();
    }
  }

  private startTimer(): void {
    this.stopTimer();

    this.timerSubscription = interval(1000).subscribe(() => {
      const expiresAt = this.codeExpiresAt();
      if (!expiresAt) return;

      const remaining = Math.max(
        0,
        Math.ceil((expiresAt.getTime() - Date.now()) / 1000),
      );
      this.remainingSeconds.set(remaining);

      if (remaining === 0) {
        this.codeExpired.set(true);
        this.stopTimer();
      }
    });
  }

  private stopTimer(): void {
    this.timerSubscription?.unsubscribe();
    this.timerSubscription = null;
  }

  get formattedTime(): string {
    const seconds = this.remainingSeconds();
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  }

  // ============================================================
  // SOUMISSION DU CODE
  // ============================================================
  submitCode(): void {
    if (this.codeForm.invalid) {
      this.codeForm.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    this.authService
      .validateInvitationCode(this.codeForm.getRawValue().code)
      .subscribe({
        next: () => {
          this.loading.set(false);
          this.stopTimer();
          // ✅ Le rôle est passé de PENDING à AGENT côté serveur :
          // on recharge l'utilisateur local (menu, guards) avant de rediriger.
          this.authService.fetchMe().subscribe({
            next: () => {
              this.notification.success('🎉 Bienvenue dans votre société !');
              this.router.navigate(['/dashboard']);
            },
            error: () => this.router.navigate(['/auth/login']),
          });
        },
        error: (err: any) => {
          this.loading.set(false);
          const message = err.error?.message;
          this.errorMessage.set(
            Array.isArray(message)
              ? message.join(', ')
              : message ?? 'Code invalide',
          );
        },
      });
  }

  // ============================================================
  // DEMANDER UN NOUVEAU CODE
  // ============================================================
  resendCode(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.authService.resendInvitationCode().subscribe({
      next: (res: any) => {
        this.loading.set(false);
        this.codeForm.reset();

        if (res?.emailSent === false) {
          this.errorMessage.set(
            "Le code a été généré mais l'e-mail n'a pas pu être envoyé. Réessayez dans quelques secondes.",
          );
        } else {
          this.notification.success(
            '🔑 Nouveau code envoyé ! Vérifiez votre email.',
          );
        }
        // Recharge la durée restante depuis le serveur
        this.loadStatus();
      },
      error: (err: any) => {
        this.loading.set(false);
        const message = err.error?.message;
        this.errorMessage.set(
          Array.isArray(message)
            ? message.join(', ')
            : message ?? 'Erreur lors de la demande',
        );
      },
    });
  }

  newRequest(): void {
    
    this.router.navigate(['/auth/complete-profile']);
  }
}