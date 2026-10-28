import { Routes } from '@angular/router';

export const USERS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./user-form/user-form').then((m) => m.UserForm),
  },
];