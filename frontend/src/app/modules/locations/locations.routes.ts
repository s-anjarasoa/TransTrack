import { Routes } from '@angular/router';

export const LOCATIONS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./locations-list/locations-list').then((m) => m.LocationsList),
  },
  {
    path: 'new',
    loadComponent: () =>
      import('./locations-form/locations-form').then((m) => m.LocationForm),
  },
  {
    path: ':id/edit',
    loadComponent: () =>
      import('./locations-form/locations-form').then((m) => m.LocationForm),
  },
];