import { HttpInterceptorFn } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { inject,PLATFORM_ID } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { NotificationService } from '../services/notification';
import { AuthService } from '../auth/auth';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const platformId = inject(PLATFORM_ID);
  const router = inject(Router);
  const notification = inject(NotificationService);
  const authService = inject(AuthService);
  const isPolling = req.url.includes('/notifications/me/unread-count');

  return next(req).pipe(
    catchError((error) => {

       if (!isPlatformBrowser(platformId)) {
        return throwError(() => error);
      }
      // Erreur réseau ou serveur
      if (!error.status) {
        if (!isPolling) notification.error('Impossible de contacter le serveur');
        return throwError(() => error);
      }

      // Gestion des codes d'erreur HTTP
      switch (error.status) {
        case 400:
          if (error.error?.message) {
            notification.error(error.error.message);
          } else if (error.error?.errors) {
            const messages = Object.values(error.error.errors).flat();
            messages.forEach((msg: any) => notification.error(msg));
          } else {
            notification.error('Requête invalide');
          }
          break;

        case 401:
          if (!req.url.includes('/auth/login') && !req.url.includes('/auth/register')) {
            authService.logout();
            notification.error('Session expirée, veuillez vous reconnecter');
          }
          break;

        case 403:
          notification.error('Vous n\'avez pas les droits nécessaires');
          break;

        case 404:
          notification.error('Ressource non trouvée');
          break;

        case 409:
          notification.error(error.error?.message || 'Conflit de données');
          break;

        case 422:
          const errPayload = error.error?.errors || error.error?.message || 'Données invalides';
          if (typeof errPayload === 'string') {
            notification.error(errPayload);
          } else if (Array.isArray(errPayload)) {
            errPayload.forEach((msg: string) => notification.error(msg));
          } else {
            notification.error('Requête invalide');
          }
          break;

        case 429:
          notification.warning('Trop de requêtes, veuillez patienter');
          break;

        case 500:
        case 502:
        case 503:
          if (!isPolling) notification.error('Erreur serveur, veuillez réessayer plus tard');
          break;

        default:
          notification.error(error.error?.message || 'Une erreur est survenue');
          break;
      }

      return throwError(() => error);
    })
  );
};