import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, TitleStrategy } from '@angular/router';

import { PageTitleStrategy } from '@core/services/page-title.strategy';
import { routes } from './app.routes';
import { HttpBackend, provideHttpClient, withInterceptors } from '@angular/common/http';
import { authInterceptor } from '@core/interceptors/auth.interceptor';
import { errorHandlerInterceptor } from '@core/interceptors/error-handler.interceptor';
import { provideTranslateService, TranslateLoader } from "@ngx-translate/core";
import { MultiTranslateHttpLoader } from 'ngx-translate-multi-http-loader';

export function HttpLoaderFactory(httpBackend: HttpBackend): MultiTranslateHttpLoader {
  return new MultiTranslateHttpLoader(httpBackend, [
    { prefix: './i18n/', suffix: '/common.json' },
    { prefix: './i18n/', suffix: '/auth.json' },
    { prefix: './i18n/', suffix: '/home.json' },
    { prefix: './i18n/', suffix: '/sidebar.json' },
    { prefix: './i18n/', suffix: '/users.json', optional: true },
    { prefix: './i18n/', suffix: '/companies.json', optional: true },
    { prefix: './i18n/', suffix: '/catalog.json', optional: true },
  ]);
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    { provide: TitleStrategy, useExisting: PageTitleStrategy },
    provideTranslateService({
      loader: {
        provide: TranslateLoader,
        useFactory: HttpLoaderFactory,
        deps: [HttpBackend]
      }
    }),
    // Las respuestas recorren los interceptores al revés: authInterceptor (el último) recibe el
    // HttpErrorResponse crudo y puede renovar la sesión ante un 401 antes de que
    // errorHandlerInterceptor lo convierta en un Error para la UI.
    provideHttpClient(withInterceptors([
      errorHandlerInterceptor,
      authInterceptor
    ]))
  ],
};
