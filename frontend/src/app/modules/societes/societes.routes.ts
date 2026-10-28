import { Routes } from '@angular/router';
import { directeurGuard } from '../../core/auth/directeur-guard';
import { authGuard } from '../../core/auth/auth-guard';
import { rolesGuard } from '../../core/auth/roles-guard';

export const SOCIETES_ROUTES: Routes = [
  {
    path: '',
    canActivate: [authGuard],
    children: [
      {
        path: '',
        loadComponent: () => import('./societes-list/societes-list').then((m) => m.SocietesList)
      },
      {
        path: 'new',
        loadComponent: () => import('./societe-form/societe-form').then((m) => m.SocieteForm),
        canActivate: [directeurGuard]
      },
      {
        path: ':id',
        loadComponent: () => import('./societe-detail/societe-detail').then((m) => m.SocieteDetail)
      },
      {
        path: ':id/edit',
        loadComponent: () => import('./societe-form/societe-form').then((m) => m.SocieteForm)
        
      }
    ]
  }
];