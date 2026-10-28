import { Routes } from '@angular/router';

export const TARIFS_ROUTES: Routes = [
  { 
    path: '', 
    loadComponent: () => import('./tarifs-list/tarifs-list').then((m) => m.TarifsList) 
  },
  { 
    path: 'new', 
    loadComponent: () => import('./tarif-form/tarif-form').then((m) => m.TarifForm)
  },
  { 
    path: ':id/edit', 
    loadComponent: () => import('./tarif-form/tarif-form').then((m) => m.TarifForm)
  },
];