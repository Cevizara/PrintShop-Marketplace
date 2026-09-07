import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter, withInMemoryScrolling } from '@angular/router';

import { routes } from './app.routes';
import { authInterceptor } from './services/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    // `anchorScrolling` je potreban da bi `fragment="narudzbine"` zaista spustio
    // stranu do tabele narudžbina na profilu. Bez njega Angular oznaku u adresi
    // prihvati, ali ne pomeri stranu - link tiho ne radi ono što obećava.
    provideRouter(
      routes,
      withInMemoryScrolling({ scrollPositionRestoration: 'top', anchorScrolling: 'enabled' })
    ),
    // Interceptor dodaje JWT token uz svaki zahtev ka serveru.
    provideHttpClient(withInterceptors([authInterceptor])),
  ],
};
