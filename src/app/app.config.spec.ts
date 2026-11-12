import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';
import { LanguageService } from '@core/services/language.service';

describe('arranque del idioma (admin)', () => {
  afterEach(() => localStorage.clear());

  function start(saved: string | null) {
    localStorage.clear();
    if (saved) localStorage.setItem('lang', saved);
    const translate = jasmine.createSpyObj<TranslateService>('TranslateService', ['use', 'addLangs', 'setFallbackLang']);
    translate.use.and.returnValue(of({}));
    TestBed.configureTestingModule({ providers: [{ provide: TranslateService, useValue: translate }] });
    TestBed.inject(LanguageService).init().subscribe();
    return translate;
  }

  it('sin idioma guardado usa es, con respaldo es', () => {
    const translate = start(null);
    expect(translate.setFallbackLang).toHaveBeenCalledOnceWith('es');
    expect(translate.use).toHaveBeenCalledOnceWith('es');
    expect(document.documentElement.lang).toBe('es');
  });

  it('con idioma guardado lo aplica una sola vez', () => {
    const translate = start('en');
    expect(translate.use).toHaveBeenCalledOnceWith('en');
    expect(document.documentElement.lang).toBe('en');
  });
});
