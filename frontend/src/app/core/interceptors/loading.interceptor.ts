import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs/operators';
import { LoadingService } from '../services/loading';

export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  const loadingService = inject(LoadingService);

  const silentUrls = [
    '/notifications/me/unread-count',
    '/auth/me',
  ];

  const isSilent = silentUrls.some((url) => req.url.includes(url));

  if (isSilent) return next(req);

  loadingService.show();

  return next(req).pipe(
    finalize(() => loadingService.hide()),
  );
};