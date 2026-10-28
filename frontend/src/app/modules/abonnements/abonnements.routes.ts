import { Routes } from '@angular/router';
import { adminGuard, directeurGuard } from '../../core/auth/directeur-guard';
import { rolesGuard } from '../../core/auth/roles-guard';

export const ABONNEMENTS_ROUTES: Routes = [
  
  {
  path: '',
  canActivate: [rolesGuard],
  data: { roles: ['ADMIN', 'AGENT'] },
  loadComponent: () => import('../abonnements/abonnements-page').then((m) => m.AbonnementsPage),
}
];