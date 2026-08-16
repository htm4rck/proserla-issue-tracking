import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { sessionScopeInterceptor } from './core/http/session-scope.interceptor';
import { tordoHashInterceptor, provideTordo } from '@tordo/frontend';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withInterceptors([tordoHashInterceptor, sessionScopeInterceptor])),
    provideTordo({
      licenseKey: 'RACI-LICENSE-001',
      tordoApiUrl: 'https://api.tordo.io',
    }),
  ],
};
