import { Component, inject, computed } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AuthService } from '../../core/auth/auth';
import { AdminDashboard } from './admin-dashboard/admin-dashboard';
import { AgentDashboard } from './agent-dashboard/agent-dashboard';
import { ClientDashboard } from './client-dashboard/client-dashboard';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [AdminDashboard, AgentDashboard, ClientDashboard],
  template: `
    @switch (role()) {
      @case ('ADMIN') { <app-admin-dashboard /> }
      @case ('AGENT') { <app-agent-dashboard /> }
      @case ('CLIENT') { <app-client-dashboard /> }
      @default {
        <div class="dash-fallback">
          <h2>Rôle utilisateur non reconnu</h2>
          <p>Votre compte ne dispose pas des permissions nécessaires.</p>
        </div>
      }
    }
  `,
  styles: [`.dash-fallback { padding: 4rem 2rem; text-align: center; color: #64748B; }`],
})
export class Dashboard {
  private authService = inject(AuthService);

  // toSignal rend le rôle réactif ; l'ancien computed() ne dépendait d'aucun signal
  private user = toSignal(this.authService.currentUser$, { initialValue: this.authService.currentUser });
  role = computed(() => this.user()?.role);
}