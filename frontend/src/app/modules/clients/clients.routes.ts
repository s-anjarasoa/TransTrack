import { Routes } from '@angular/router';

export const CLIENTS_ROUTES: Routes = [
  { path: '', 
    loadComponent: () => import('./clients-list/clients-list').then((m) => m.ClientsList) 
  },
  { path: 'me', 
    loadComponent: () => import('./client-profile/client-profile').then((m) => m.ClientProfile) 
  },
  { path: ':id',
    loadComponent: () => import('./client-detail/client-detail').then((m) => m.ClientDetail) 
  },
];