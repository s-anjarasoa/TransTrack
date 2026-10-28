import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';

import { AuthService } from '../../../core/auth/auth';
import { NotificationService } from '../../../core/services/notification';

import { ClientForm } from './client-form/client-form';
import { AgentForm } from './agent-form/agent-form';

@Component({
  selector: 'app-complete-profile',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatTabsModule,
    ClientForm,
    AgentForm,
  ],
  templateUrl: './complete-profile.html',
  styleUrl: './complete-profile.css',
})
export class CompleteProfile implements OnInit {
  private authService = inject(AuthService);
  private notification = inject(NotificationService);
  private router = inject(Router);

  selectedTabIndex = signal(0);
  errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    const user: any = this.authService.currentUser;

    if (!user || user.profileCompleted) {
      this.router.navigate(['/dashboard']);
      return;
    }

    // Demande agent déjà envoyée : on reprend là où l'utilisateur s'était arrêté
    if (['EN_ATTENTE', 'PRE_VALIDE', 'REJETE'].includes(user.agentStatus)) {
      this.router.navigate(['/auth/agent-code']);
    }
  }

  onTabChange(index: number): void {
    this.selectedTabIndex.set(index);
    this.errorMessage.set(null);
  }

  // Appelé par client-form après succès
  onClientComplete(): void {
    this.notification.success('Profil client complété ! 🎉');
    this.router.navigate(['/dashboard']);
  }

  // Appelé par agent-form après l'envoi de la demande
  onAgentRequestSent(): void {
    this.errorMessage.set(null);
    this.notification.success('Demande envoyée au Directeur.');
    this.router.navigate(['/auth/agent-code']);
  }

  // Appelé par agent-form en cas d'erreur
  onAgentError(message: string): void {
    this.errorMessage.set(message);
  }
}