import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map, catchError, of } from 'rxjs';
import { AgentProfileService } from '../services/agent-profile';
import { AgentType } from '../models/agent.model';
import { AuthService } from './auth';


export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.hasRole('ADMIN')) return true;
  router.navigate(['/dashboard']);
  return false;
};

export const directeurGuard: CanActivateFn = () => {
  const agentProfileService = inject(AgentProfileService);
  const router = inject(Router);

  return agentProfileService.ensureLoaded().pipe(
    map((agent) => {
      if (agent?.type === AgentType.DIRECTEUR) return true;
      router.navigate(['/unauthorized']);
      return false;
    }),
    catchError(() => {
      router.navigate(['/unauthorized']);
      return of(false);
    }),
  );
};