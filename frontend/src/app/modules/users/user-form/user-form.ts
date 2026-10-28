import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { UserClient } from '../user-client/user-client';
import { UserAgent } from '../user-agent/user-agent';
import { UserCode } from '../user-code/user-code';
import { UserService } from '../user.ts';

type ActiveTab = 'client' | 'agent';

@Component({
  selector: 'app-user-form',
  standalone: true,
  imports: [
    CommonModule,
    
    
  ],
  templateUrl: './user-form.html',
  styleUrl: './user-form.css'
})
export class UserForm {
  private userService = inject(UserService);
  private router = inject(Router);

  activeTab = signal<ActiveTab>('client');
  showCodeDialog = signal(false);
  loading = signal(false);
  errorMessage = signal<string | null>(null);

  pendingAgentData: any = null;

  setTab(tab: ActiveTab): void {
    this.activeTab.set(tab);
    this.errorMessage.set(null);
  }

  // Soumission Client via UserService
  onClientSubmit(clientData: any): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.userService.createClient(clientData).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/client-dashboard']);
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set(err.error?.message ?? 'Erreur lors de la création du profil client.');
      }
    });
  }

  // Ouverture du dialogue code d'invitation pour l'Agent
  onAgentSubmit(agentData: any): void {
    this.pendingAgentData = agentData;
    this.showCodeDialog.set(true);
  }

  // Soumission Agent via UserService
  onCodeSubmitted(invitationCode: string): void {
    if (!this.pendingAgentData) return;

    this.loading.set(true);
    const payload = { ...this.pendingAgentData, invitationCode };

    this.userService.registerAgent(payload).subscribe({
      next: (res) => {
        this.loading.set(false);
        this.showCodeDialog.set(false);
        alert(res.message);
        this.router.navigate(['/login']);
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set(err.error?.message ?? 'Code d\'invitation invalide.');
      }
    });
  }

  closeCodeDialog(): void {
    this.showCodeDialog.set(false);
  }
}