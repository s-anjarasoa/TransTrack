// modules/auth/auth.routes.ts
import { Routes } from '@angular/router';

export const AUTH_ROUTES: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./login/login').then((m) => m.Login),
  },
  {
    path: 'register',
    loadComponent: () => import('./register/register').then((m) => m.Register),
  },
  {
    path: 'complete-profile',
    loadComponent: () => import('./complete-profile/complete-profile').then((m) => m.CompleteProfile),
  }, 
  {
    path: 'agent-code',
    loadComponent: () =>    import('./agent-code/agent-code').then((m) => m.AgentCode),
  },  
  { 
    path: 'register-agent',
    loadComponent: () => import('./register-agent/register-agent').then((m) => m.RegisterAgent) 
  },
  {
    path: 'forgot-password',
    loadComponent: () => import('./forgot-password/forgot-password').then((m) => m.ForgotPassword),
    
  },
  {
    path: 'reset-password',
    loadComponent: () => import('./reset-password/reset-password').then((m) => m.ResetPassword),
  },
  /*{
    path: 'register-agent',
    loadComponent: () => import('./register-agent/register-agent').then((m) => m.RegisterAgentComponent),
  },*/
  {
    path: 'reset-password',
    loadComponent: () => import('./reset-password/reset-password').then((m) => m.ResetPassword),
  },
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
];