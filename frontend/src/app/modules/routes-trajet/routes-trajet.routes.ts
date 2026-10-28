import { Routes } from '@angular/router';

export const ROUTES_TRAJET_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./routes-list/routes-list').then((m) => m.RoutesList),
  },
  {
    path: 'new',
    loadComponent: () =>
      import('./route-form/route-form').then((m) => m.RouteForm),
  },
  {
    path: ':id/edit',
    loadComponent: () =>
      import('./route-form/route-form').then((m) => m.RouteForm),
  },
  {   
    path: ':id',
    loadComponent: () =>
      import('./route-detail/route-detail').then((m) => m.RouteDetail),
  },
  
];