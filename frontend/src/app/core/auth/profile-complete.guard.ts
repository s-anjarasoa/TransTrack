import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from './auth';

export const profileCompleteGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const user = authService.currentUser;

  if (!user) {
    router.navigate(['/auth/login']);
    return false;
  }

  const hasProfile = !!user.client || !!user.agent;
  const isSetupPage = state.url.startsWith('/profile/complete');

  if (!hasProfile && !isSetupPage) {
    router.navigate(['/profile/complete']);
    return false;
  }

  if (hasProfile && isSetupPage) {
    router.navigate(['/dashboard']);
    return false;
  }

  return true;
};