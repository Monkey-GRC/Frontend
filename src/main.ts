import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';
import { TranslateService } from '@ngx-translate/core';
import { registerLicense } from '@syncfusion/ej2-base';
import { initializeSyncfusionOnAppStart } from '@config/syncfusion-locale.config';

// 🔑 Syncfusion License
registerLicense('Ngo9BigBOggjHTQxAR8/V1JGaF5cXGpCf1FpRmJGdld5fUVHYVZUTXxaS00DNHVRdkdmWH1ceXZXRWJcU0BxWEVWYEs=');

// 🗣️ Inicializar Syncfusion con el idioma guardado
initializeSyncfusionOnAppStart();

bootstrapApplication(AppComponent, appConfig)
  .then(appRef => {
    const translate = appRef.injector.get(TranslateService);
    const lang = localStorage.getItem('lang') || 'es';
    translate.setFallbackLang('es');
    translate.use(lang);
  })
  .catch((err) => console.error(err));
