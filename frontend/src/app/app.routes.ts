import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth-guard';
import { rolesGuard } from './core/auth/roles-guard';

export const routes: Routes = [
  {
    path: 'auth',
    loadChildren: () => import('./modules/auth/auth.routes').then((m) => m.AUTH_ROUTES),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./modules/layouts/default-layout/default-layout').then((m) => m.DefaultLayout),
    children: [

     { path: 'dashboard', 
      loadComponent: () => import('./modules/dashboard/dashboard').then((m) => m.Dashboard) 
     },

     {
        path: 'agents',
        canActivate: [rolesGuard],
        data: { roles: ['ADMIN', 'AGENT'] },
        loadChildren: () => import('./modules/agents/agents.routes').then((m) => m.AGENTS_ROUTES),
      },

      {
        path: 'societes',
        canActivate: [rolesGuard],
        data: { roles: ['ADMIN', 'AGENT'] },
        loadChildren: () => import('./modules/societes/societes.routes').then((m) => m.SOCIETES_ROUTES),
      },

      {
        path: 'abonnements',
        canActivate: [rolesGuard],
        data: { roles: ['ADMIN', 'AGENT'] },
        loadChildren: () => import('./modules/abonnements/abonnements.routes').then((m) => m.ABONNEMENTS_ROUTES),
      },

      {
        path: 'clients',
        loadChildren: () => import('./modules/clients/clients.routes').then((m) => m.CLIENTS_ROUTES),
      },
      
      {
        path: 'moyens-trans',
        canActivate: [rolesGuard],
        data: { roles: ['ADMIN', 'AGENT'] },
        loadChildren: () => import('./modules/moyens-trans/moyens-trans.routes').then((m) => m.MOYENS_TRANS_ROUTES),
      },

      {
        path: 'vehicules',
        canActivate: [rolesGuard],
        data: { roles: ['ADMIN', 'AGENT'] },
        loadChildren: () => import('./modules/vehicules/vehicules.routes').then((m) => m.VEHICULES_ROUTES),
      },

      {
        path: 'locations',
        canActivate: [rolesGuard],
        data: { roles: ['ADMIN', 'AGENT'] },
        loadChildren: () => import('./modules/locations/locations.routes').then((m) => m.LOCATIONS_ROUTES),
      },

      {
        path: 'routes',
        canActivate: [rolesGuard],
        data: { roles: ['ADMIN', 'AGENT'] },
        loadChildren: () => import('./modules/routes-trajet/routes-trajet.routes').then((m) => m.ROUTES_TRAJET_ROUTES),
      },

      {
        path: 'tarifs',
        canActivate: [rolesGuard],
        data: { roles: ['ADMIN', 'AGENT'] },
        loadChildren: () => import('./modules/tarifs/tarifs.routes').then((m) => m.TARIFS_ROUTES),
      },

      {
        path: 'voyages',
        canActivate: [rolesGuard],
        data: { roles: ['ADMIN', 'AGENT'] },
        loadChildren: () => import('./modules/voyages/voyages.routes').then((m) => m.VOYAGES_ROUTES),
      },

      {
        path: 'reservations',
        loadChildren: () => import('./modules/reservations/reservations.routes').then((m) => m.RESERVATIONS_ROUTES),
      },

      {
        path: 'reserver',
        loadChildren: () => import('./modules/reservations/reserver.routes').then((m) => m.RESERVER_ROUTES),
      },

      {
        path: 'paiement/simulation/:reference',
        canActivate: [authGuard], 
        loadComponent: () => import('./modules/payments/payment-simulation/payment-simulation').then((m) => m.PaymentSimulation)
      },

      {
       path: 'routing',
       loadChildren: () => import('./modules/routing/routing.routes').then((m) => m.ROUTING_ROUTES),
       canActivate: [authGuard],           
       data: { roles: ['CLIENT', 'AGENT', 'ADMIN'] },  
      },
      {
       path: 'billets',
       loadChildren: () => import('./modules/billets/billets.routes').then((m) => m.BILLETS_ROUTES),
      },

      {
       path: 'bagages',
       loadChildren: () => import('./modules/bagages/bagages.routes').then((m) => m.BAGAGES_ROUTES),
      },
      {
        path: 'preferences',
        loadComponent: () => import('./modules/preferences/preferences.component').then((m) => m.PreferencesComponent),
      },

      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    ],
  },
  {
    path: 'admin',
    canActivate: [authGuard, rolesGuard],
    data: { roles: ['ADMIN'] },
    loadComponent: () => import('./modules/layouts/admin-layout/admin-layout').then((m) => m.AdminLayout),
    children: [
     /* {
        path: 'users',
        loadChildren: () => import('./modules/users/users.routes').then((m) => m.USERS_ROUTES),
      },
      { path: '', redirectTo: 'users', pathMatch: 'full' },*/
    ],
  },
  
  { path: '**', redirectTo: '' },
];