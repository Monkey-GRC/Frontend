import { ApplicationConfig, inject, provideAppInitializer, Injector, provideZoneChangeDetection } from '@angular/core';
import { PreloadAllModules, provideRouter, TitleStrategy, withPreloading } from '@angular/router';

import { PageTitleStrategy } from '@core/services/page-title.strategy';
import { LanguageService, Language, SAVE_LANGUAGE } from '@core/services/language.service';
import { ThemeService } from '@core/services/theme.service';
import { routes } from './app.routes';
import { HttpBackend, provideHttpClient, withInterceptors } from '@angular/common/http';
import { authInterceptor } from '@core/interceptors/auth.interceptor';
import { errorHandlerInterceptor } from '@core/interceptors/error-handler.interceptor';
import { provideTranslateService, TranslateLoader } from "@ngx-translate/core";
import { MultiTranslateHttpLoader } from 'ngx-translate-multi-http-loader';
import { AuthService } from '@core/services/auth.service';

export function HttpLoaderFactory(httpBackend: HttpBackend): MultiTranslateHttpLoader {
  return new MultiTranslateHttpLoader(httpBackend, [
    { prefix: './i18n/', suffix: '/common.json' },
    { prefix: './i18n/', suffix: '/auth.json' },
    { prefix: './i18n/', suffix: '/home.json' },
    { prefix: './i18n/', suffix: '/sidebar.json' },
    { prefix: './i18n/', suffix: '/companies.json', optional: true },
    { prefix: './i18n/', suffix: '/catalog.json', optional: true },
    { prefix: './i18n/', suffix: '/settings.json', optional: true },
    { prefix: './i18n/', suffix: '/admin-users.json', optional: true },
  ]);
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    // El idioma guardado (respaldo 'es') se aplica antes de pintar: la app espera a tener los textos.
    provideAppInitializer(() => inject(LanguageService).init()),
    // Guarda el idioma de la persona con sesión (D111). Se resuelve al usarlo: así LanguageService y AuthService no se piden uno al otro.
    {
      provide: SAVE_LANGUAGE,
      useFactory: () => {
        const injector = inject(Injector);
        return (lang: Language) => {
          const auth = injector.get(AuthService);
          return auth.currentUser ? auth.saveLanguage(lang) : null;
        };
      },
    },
    // El tema (claro/oscuro) se aplica al arrancar, en CUALQUIER pantalla: antes solo lo hacía el selector de tema, que no existe en las pantallas fuera del layout (Ajustes).
    provideAppInitializer(() => {
      inject(ThemeService);
    }),
    // Las pantallas se descargan en segundo plano apenas arranca la app, para que abrirlas no espere a la red (Ajustes, Volver).
    provideRouter(routes, withPreloading(PreloadAllModules)),
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
