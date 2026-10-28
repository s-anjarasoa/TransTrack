import { Routes } from '@angular/router';

export const RESERVER_ROUTES: Routes = [
  
  { 
    path: 'search', 
    loadComponent: () => import('./voyage-search/voyage-search').then((m) => m.VoyageSearch)
  },
  {
    path: 'create',
    loadComponent: () => import('./reservation-create/reservation-create').then(m => m.ReservationCreate)
  }
   
];