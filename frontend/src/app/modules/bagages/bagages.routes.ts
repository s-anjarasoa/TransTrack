import { Routes } from '@angular/router';

export const BAGAGES_ROUTES: Routes = [
  
  { 
    path: '', 
    loadComponent: () => import('./bagages-list/bagages-list').then((m) => m.BagagesList)
  },
 
];