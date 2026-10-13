import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { LanguageToggle } from '@core/presentation/components/app-header/language-toggle/language-toggle';
import { ThemeToggleTwoComponent } from '@core/presentation/components/theme-toggle-two/theme-toggle-two.component'

@Component({
  selector: 'app-auth-page-layout',
  imports: [
    RouterModule,
    ThemeToggleTwoComponent,
    LanguageToggle,
    TranslatePipe,
  ],
  templateUrl: './auth-page-layout.component.html',
  styles: ``
})
export class AuthPageLayoutComponent {

  currentYear: number = new Date().getFullYear();

}
