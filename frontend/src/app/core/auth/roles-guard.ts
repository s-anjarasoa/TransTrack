// src/app/core/auth/roles-guard.ts
import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth';
import { map, catchError, of } from 'rxjs';

export const rolesGuard: CanActivateFn = (route) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);

  const requiredRoles = route.data?.['roles'] as string[] | undefined;

  if (!requiredRoles || requiredRoles.length === 0) {
    return true;
  }

  // ✅ SSR : Laisser passer
  if (!isPlatformBrowser(platformId)) {
    return true;
  }

  if (!authService.isAuthenticated()) {
    router.navigate(['/auth/login']);
    return false;
  }

  if (authService.currentUser) {
    const user = authService.currentUser;
    if (requiredRoles.includes(user.role)) {
      return true;
    }
    router.navigate(['/dashboard']);
    return false;
  }

  return authService.fetchMe().pipe(
    map((user) => {
      if (user && requiredRoles.includes(user.role)) {
        return true;
      }
      router.navigate(['/dashboard']);
      return false;
    }),
    catchError(() => {
      router.navigate(['/auth/login']);
      return of(false);
    }),
  );
};