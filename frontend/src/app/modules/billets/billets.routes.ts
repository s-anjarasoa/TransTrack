import { Routes } from '@angular/router';

export const BILLETS_ROUTES: Routes = [
  
  { 
    path: '', 
    loadComponent: () => import('./billets-list/billets-list').then((m) => m.BilletsList)
  },
 
];