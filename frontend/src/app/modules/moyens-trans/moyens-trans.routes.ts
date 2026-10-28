import { Routes } from '@angular/router';

export const MOYENS_TRANS_ROUTES: Routes = [
  { path: '', 
    loadComponent: () => import('./moyens-trans-list/moyens-trans-list').then((m) => m.MoyensTransList) 
  },
  
  { path: 'new', 
    loadComponent: () => import('./moyen-trans-form/moyen-trans-form').then((m) => m.MoyenTransForm)
  },
 
  { path: ':id/edit', 
    loadComponent: () => import('./moyen-trans-form/moyen-trans-form').then((m) => m.MoyenTransForm) 
  },
];