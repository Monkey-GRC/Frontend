import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { HttpBackend, provideHttpClient, withInterceptors } from '@angular/common/http';
import { authInterceptor } from '@core/interceptors/auth.interceptor';
import { errorHandlerInterceptor } from '@core/interceptors/error-handler.interceptor';
import { provideTranslateService, TranslateLoader } from "@ngx-translate/core";
import { MultiTranslateHttpLoader } from 'ngx-translate-multi-http-loader';

export function HttpLoaderFactory(httpBackend: HttpBackend): MultiTranslateHttpLoader {
  return new MultiTranslateHttpLoader(httpBackend, [
    { prefix: './i18n/', suffix: '/sidebar.json' },
    { prefix: './i18n/', suffix: '/risk.json', optional: true },
    { prefix: './i18n/', suffix: '/reason.json', optional: true },
    { prefix: './i18n/', suffix: '/users.json', optional: true },
  ]);
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideTranslateService({
      loader: {
        provide: TranslateLoader,
        useFactory: HttpLoaderFactory,
        deps: [HttpBackend]
      }
    }),
    provideHttpClient(withInterceptors([
      authInterceptor,
      errorHandlerInterceptor
    ]))
  ],
};
