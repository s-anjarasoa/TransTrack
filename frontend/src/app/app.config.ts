// frontend/src/app/app.config.ts
import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors, withFetch } from '@angular/common/http';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideToastr } from 'ngx-toastr';
import { routes } from './app.routes';
import { LOCALE_ID,  } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import { jwtInterceptor } from './core/auth/jwt-interceptor';
import { errorInterceptor } from './core/interceptors/error-interceptor';
import { loadingInterceptor } from './core/interceptors/loading.interceptor';
import localeFr from '@angular/common/locales/fr';

registerLocaleData(localeFr);

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideClientHydration(withEventReplay()),
    provideHttpClient(
      withFetch(),
      withInterceptors([
        jwtInterceptor, 
        errorInterceptor,
        loadingInterceptor
      ])
    ),
    provideAnimationsAsync(),
    provideToastr({
      positionClass: 'toast-top-right',
      preventDuplicates: true,
      timeOut: 3000,
      closeButton: true,
      progressBar: true,
    }),
    { provide: LOCALE_ID, useValue: 'fr' }
  ],
};