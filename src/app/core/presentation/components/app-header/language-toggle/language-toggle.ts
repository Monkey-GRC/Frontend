import { ChangeDetectionStrategy, ChangeDetectorRef, Component } from '@angular/core';
import { TranslateDirective, TranslateModule, TranslatePipe, TranslateService } from '@ngx-translate/core';

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
    private translate: TranslateService
  ) {
    this.currentLang = localStorage.getItem('lang') || 'es';
    this.translate.use(this.currentLang);
  }

  toggleLanguage() {
    this.currentLang = this.currentLang === 'es' ? 'en' : 'es';
    localStorage.setItem('lang', this.currentLang);
    this.translate.use(this.currentLang);
  }
}