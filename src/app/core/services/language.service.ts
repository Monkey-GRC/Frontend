import { Injectable, inject, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

export type Language = 'es' | 'en';

const STORAGE_KEY = 'lang';
const isLanguage = (value: unknown): value is Language => value === 'es' || value === 'en';

function storedLanguage(): Language {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return isLanguage(value) ? value : 'es';
  } catch {
    return 'es';
  }
}

// Un solo lugar cambia el idioma de la app: lo guarda (de ahí lo lee `Accept-Language` en cada petición) y carga los textos.
@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly translate = inject(TranslateService);

  readonly current = signal<Language>(storedLanguage());

  set(lang: Language): void {
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // Sin almacenamiento el idioma vale solo para esta sesión.
    }
    this.translate.use(lang);
    this.current.set(lang);
  }
}
