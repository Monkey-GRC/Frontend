import { ChangeDetectionStrategy, Component } from '@angular/core';
import { LanguageService } from '@core/services/language.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-language-toggle',
  imports: [
    TranslateModule
  ],
  templateUrl: './language-toggle.html',
  styleUrl: './language-toggle.css',
  changeDetection: ChangeDetectionStrategy.Default,
})
export class LanguageToggle {

  currentLang = 'es';

  constructor(
    private translate: TranslateService,
    private language: LanguageService,
  ) {
    this.currentLang = localStorage.getItem('lang') || 'es';
    this.translate.use(this.currentLang);
  }

  toggleLanguage() {
    this.currentLang = this.currentLang === 'es' ? 'en' : 'es';
    this.language.set(this.currentLang as 'es' | 'en');
  }
}