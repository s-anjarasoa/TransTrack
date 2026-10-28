import { Routes } from '@angular/router';

export const VOYAGES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./voyages-list/voyages-list').then((m) => m.VoyagesList),
  },
  {
    path: 'new',
    loadComponent: () =>
      import('./voyage-form/voyage-form').then((m) => m.VoyageForm),
  },
  {
    path: ':id/edit',
    loadComponent: () =>
      import('./voyage-form/voyage-form').then((m) => m.VoyageForm),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./voyage-detail/voyage-detail').then((m) => m.VoyageDetail),
  },
];