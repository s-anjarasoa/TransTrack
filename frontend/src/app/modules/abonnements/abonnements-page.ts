import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop'; // ✅ Pour convertir l'Observable en Signal
import { AbonnementsList } from './abonnements-list/abonnements-list';
import { AbonnementSubscribe } from './subscribe/subscribe';
import { AuthService } from '../../core/auth/auth'; 
import { AgentProfileService } from '../../core/services/agent-profile';
import { AgentType } from '../../core/models/agent.model'; // ✅ Importer l'enum

@Component({
  selector: 'app-abonnements-page',
  standalone: true,
  imports: [CommonModule, AbonnementsList, AbonnementSubscribe],
  template: `
    @if (isAdmin()) {
      <app-abonnements-list />
    } @else if (isDirecteur()) {
      <app-abonnement-subscribe />
    } @else {
      <div style="padding: 2rem; text-align: center; color: red;">
        Accès non autorisé.
      </div>
    }
  `
})
export class AbonnementsPage {
  private authService = inject(AuthService);
  private agentProfileService = inject(AgentProfileService);

   private agentProfile = toSignal(this.agentProfileService.ensureLoaded());

  isAdmin(): boolean {
    return this.authService.currentUser?.role === 'ADMIN';
  }

  isDirecteur(): boolean {
    const agent = this.agentProfile();
    const user = this.authService.currentUser;
    
    return user?.role === 'AGENT' && agent?.type === AgentType.DIRECTEUR; 
  }
}