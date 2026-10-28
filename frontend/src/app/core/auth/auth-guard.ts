// src/app/core/auth/auth-guard.ts
import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth';
import { map, catchError, of } from 'rxjs';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);

  // ✅ En SSR, laisser passer (le client vérifiera)
  if (!isPlatformBrowser(platformId)) {
    return true;
  }

  if (!authService.isAuthenticated()) {
    router.navigate(['/auth/login']);
    return false;
  }

  if (authService.currentUser) {
    return true;
  }

  return authService.fetchMe().pipe(
    map(() => true),
    catchError(() => {
      router.navigate(['/auth/login']);
      return of(false);
    }),
  );
};