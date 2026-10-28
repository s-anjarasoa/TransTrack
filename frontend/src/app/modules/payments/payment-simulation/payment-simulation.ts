import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { Subscription, interval } from 'rxjs';

import {
  PaymentGatewayService,
  PaymentView,
  SimulatedMethod,
  SimulationOutcome,
} from '../payments';

interface MethodOption {
  value: SimulatedMethod;
  label: string;
  icon: string;
  needsPhone: boolean;
}

@Component({
  selector: 'app-payment-simulation',
  standalone: true,
  imports: [MatIconModule],
  templateUrl: './payment-simulation.html',
  styleUrl: './payment-simulation.css',
})
export class PaymentSimulation implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private gateway = inject(PaymentGatewayService);

  private reference = '';
  private timerSub: Subscription | null = null;

  loading = signal(true);
  processing = signal(false);
  payment = signal<PaymentView | null>(null);
  errorMessage = signal<string | null>(null);
  remainingSeconds = signal(0);

  method = signal<SimulatedMethod>('MVOLA');
  phone = signal('');

  readonly methods: MethodOption[] = [
    { value: 'MVOLA', label: 'MVola', icon: 'smartphone', needsPhone: true },
    { value: 'ORANGE_MONEY', label: 'Orange Money', icon: 'smartphone', needsPhone: true },
    { value: 'AIRTEL_MONEY', label: 'Airtel Money', icon: 'smartphone', needsPhone: true },
    { value: 'CARD', label: 'Carte bancaire', icon: 'credit_card', needsPhone: false },
  ];

  needsPhone = computed(
    () => this.methods.find((m) => m.value === this.method())?.needsPhone ?? false,
  );

  phoneValid = computed(() => {
    if (!this.needsPhone()) return true;
    return /^\+?[0-9]{9,15}$/.test(this.phone().replace(/\s/g, ''));
  });

  isPending = computed(() => this.payment()?.status === 'EN_ATTENTE');

  ngOnInit(): void {
    this.reference = this.route.snapshot.paramMap.get('reference') ?? '';
    this.load();
  }

  ngOnDestroy(): void {
    this.stopTimer();
  }

  private load(): void {
    this.loading.set(true);
    this.gateway.getStatus(this.reference).subscribe({
      next: (p) => {
        this.setPayment(p);
        this.loading.set(false);
      },
      error: (err: any) => {
        this.loading.set(false);
        this.errorMessage.set(err?.error?.message ?? 'Paiement introuvable.');
      },
    });
  }

  private setPayment(p: PaymentView): void {
    this.payment.set(p);
    this.remainingSeconds.set(p.expiresInSeconds);

    if (p.status === 'EN_ATTENTE' && p.expiresInSeconds > 0) {
      this.startTimer();
    } else {
      this.stopTimer();
    }
  }

  private startTimer(): void {
    this.stopTimer();
    this.timerSub = interval(1000).subscribe(() => {
      const next = Math.max(0, this.remainingSeconds() - 1);
      this.remainingSeconds.set(next);
      if (next === 0) {
        this.stopTimer();
        this.load(); 
      }
    });
  }

  private stopTimer(): void {
    this.timerSub?.unsubscribe();
    this.timerSub = null;
  }

  get formattedTime(): string {
    const s = this.remainingSeconds();
    return `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60)
      .toString()
      .padStart(2, '0')}`;
  }

  formatAmount(amount: number): string {
    return `${amount.toLocaleString('fr-FR')} Ar`;
  }

  selectMethod(value: SimulatedMethod): void {
    this.method.set(value);
    this.errorMessage.set(null);
  }

  onPhoneInput(event: Event): void {
    this.phone.set((event.target as HTMLInputElement).value);
  }

  pay(outcome: SimulationOutcome): void {
    if (outcome !== 'ANNULATION' && !this.phoneValid()) {
      this.errorMessage.set('Saisissez un numéro valide, ex. : +261340000001');
      return;
    }

    this.processing.set(true);
    this.errorMessage.set(null);

    const phone = this.phone().replace(/\s/g, '');

    this.gateway
      .simulate(this.reference, {
        outcome,
        method: this.method(),
        phone: this.needsPhone() && phone ? phone : undefined,
      })
      .subscribe({
        next: (p) => {
          this.processing.set(false);
          this.setPayment(p);
        },
        error: (err: any) => {
          this.processing.set(false);
          const message = err?.error?.message;
          this.errorMessage.set(
            Array.isArray(message) ? message.join(', ') : message ?? 'Une erreur est survenue.',
          );
          this.load(); 
        },
      });
  }

  goBack(): void {
    const target = this.payment()?.returnPath;
    this.router.navigateByUrl(target && target.startsWith('/') ? target : '/dashboard');
  }

  // ✅ AJOUT : Méthodes pour la carte de contexte
  getReasonLabel(reason: string): string {
    switch (reason) {
      case 'ABONNEMENT': return 'Paiement d\'abonnement';
      case 'RESERVATION': return 'Paiement de réservation';
      case 'REMBOURSEMENT': return 'Remboursement';
      default: return 'Transaction';
    }
  }

  getReasonIcon(reason: string): string {
    switch (reason) {
      case 'ABONNEMENT': return 'workspace_premium';
      case 'RESERVATION': return 'confirmation_number';
      case 'REMBOURSEMENT': return 'currency_exchange';
      default: return 'receipt';
    }
  }
}