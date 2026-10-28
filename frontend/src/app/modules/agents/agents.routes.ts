import { Routes } from '@angular/router';
import { authGuard } from '../../core/auth/auth-guard';
import { rolesGuard } from '../../core/auth/roles-guard';

export const AGENTS_ROUTES: Routes = [
  {
    path: '',
    canActivate: [authGuard, rolesGuard],
    data: { roles: ['ADMIN', 'AGENT'] },
    children: [
      {
        path: '',
        loadComponent: () => import('./agents-list/agents-list').then((m) => m.AgentsList),
        title: 'Agents - TransTrack'
      },
      {
        path: ':id',
        loadComponent: () => import('./agent-detail/agent-detail').then((m) => m.AgentDetail),
        title: 'Détail agent - TransTrack'
      }
    ]
  }
];