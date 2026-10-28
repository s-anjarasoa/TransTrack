import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { DatePipe, CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

import { CheckoutResponse, Plan, PlanType, SubscriptionsService } from '../abonnements';
import { Abonnement, AbonnementType } from '../../../core/models/abonnement.model';
import { AuthService } from '../../../core/auth/auth';
import { AgentProfileService } from '../../../core/services/agent-profile';
import { AgentType } from '../../../core/models/agent.model';

@Component({
  selector: 'app-abonnement-subscribe',
  standalone: true,
  imports: [CommonModule, MatIconModule, DatePipe],
  templateUrl: './subscribe.html',
  styleUrl: './subscribe.css',
})
export class AbonnementSubscribe implements OnInit {
  private subscriptions = inject(SubscriptionsService);
  private authService = inject(AuthService);
  private agentProfileService = inject(AgentProfileService);
  private router = inject(Router);

  loading = signal(true);
  plans = signal<Plan[]>([]);
  history = signal<Abonnement[]>([]);
  payingType = signal<PlanType | null>(null);
  errorMessage = signal<string | null>(null);

  isAdmin = this.authService.hasRole('ADMIN');
  
  // ✅ CORRECTION 1 : Utilisation de computed() pour réagir au chargement asynchrone du profil
  isDirecteur = computed(() => this.agentProfileService.profile()?.type === AgentType.DIRECTEUR);

  activeSubscription = computed(() => {
    return this.history().find(a => a.isActif && this.isNotExpired(a)) || null;
  });

  ngOnInit(): void {
    this.loadData();
  }

  private loadData(): void {
    this.loading.set(true);
    this.subscriptions.plans().subscribe({
      next: (plans) => {
        this.plans.set(plans);
        this.subscriptions.findAll({ limit: 10 }).subscribe({
          next: (res) => {
            this.history.set(res.data);
            this.loading.set(false);
          },
          error: () => this.loading.set(false),
        });
      },
      error: (err: any) => {
        this.loading.set(false);
        this.errorMessage.set(err?.error?.message ?? 'Impossible de charger les offres.');
      },
    });
  }

  isNotExpired(sub: Abonnement): boolean {
    if (!sub.dateFin) return true;
    return new Date(sub.dateFin).getTime() > new Date().getTime();
  }

  getSubStatusLabel(sub: Abonnement): string {
    if (!sub.isActif) return 'En attente';
    if (!this.isNotExpired(sub)) return 'Expiré';
    return 'Actif';
  }

  getSubStatusClass(sub: Abonnement): string {
    if (!sub.isActif) return 'badge-warning';
    if (!this.isNotExpired(sub)) return 'badge-danger';
    return 'badge-success';
  }

  formatPrice(price: number): string {
    return `${price.toLocaleString('fr-FR')} Ar`;
  }

  getTypeLabel(type: AbonnementType): string {
    return type === AbonnementType.MENSUEL ? 'Mensuel' : 'Annuel';
  }

  subscribe(plan: Plan): void {
    // ✅ CORRECTION 2 : Blocage de sécurité (si l'utilisateur force le clic)
    if (this.activeSubscription()) {
      this.errorMessage.set('Vous avez déjà un abonnement actif. Vous ne pouvez le renouveler qu\'après son expiration.');
      return;
    }

    this.payingType.set(plan.type);
    this.errorMessage.set(null);

    this.subscriptions.subscribe(plan.type).subscribe({
      next: (res) => this.redirectToCheckout(res),
      error: (err: any) => {
        this.payingType.set(null);
        const message = err?.error?.message;
        this.errorMessage.set(
          Array.isArray(message) ? message.join(', ') : message ?? 'Une erreur est survenue.',
        );
      },
    });
  }

  private redirectToCheckout(res: CheckoutResponse): void {
    if (!res.checkoutUrl) {
      this.payingType.set(null);
      this.errorMessage.set("Aucune page de paiement n'a été fournie.");
      return;
    }
    try {
      const url = new URL(res.checkoutUrl, window.location.origin);
      if (url.origin === window.location.origin) {
        this.router.navigateByUrl(url.pathname + url.search);
        return;
      }
    } catch {}
    window.location.assign(res.checkoutUrl);
  }
}