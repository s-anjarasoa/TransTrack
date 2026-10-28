import { Routes } from '@angular/router';

export const VEHICULES_ROUTES: Routes = [
  { 
    path: '', 
    loadComponent: () => import('./vehicules-list/vehicules-list').then((m) => m.VehiculesList) 
  },
  { 
    path: 'new', 
    loadComponent: () => import('./vehicule-form/vehicule-form').then((m) => m.VehiculeForm) 
  },
  { 
    path: ':id/edit', 
    loadComponent: () => import('./vehicule-form/vehicule-form').then((m) => m.VehiculeForm) 
  },
];