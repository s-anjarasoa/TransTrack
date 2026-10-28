import { Routes } from '@angular/router';

export const ROUTING_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>import('./routing-page/routing-page').then((m) => m.RoutingPage),
  },
];