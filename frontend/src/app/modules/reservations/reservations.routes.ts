import { Routes } from '@angular/router';

export const RESERVATIONS_ROUTES: Routes = [
  { 
    path: '', 
    loadComponent: () => import('./reservations-list/reservations-list').then((m) => m.ReservationsList) 
  },
  
  { 
    path: ':id', 
    loadComponent: () => import('./reservation-detail/reservation-detail').then((m) => m.ReservationDetail)
  },
];