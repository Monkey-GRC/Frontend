import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { NavigationHistoryService } from '@core/services/navigation-history.service';
import { SidebarService } from '@core/services/sidebar.service';
import { AppHeaderComponent } from '@core/presentation/components/app-header/app-header.component';
import { AppSidebarComponent } from '@core/presentation/components/app-sidebar/app-sidebar.component';
import { BackdropComponent } from '../../components/backdrop/backdrop.component';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    AppHeaderComponent,
    AppSidebarComponent,
    BackdropComponent,
    TranslatePipe
  ],
  templateUrl: './app-layout.component.html',
})

export class AppLayoutComponent {
  sidebarService = inject(SidebarService);

  readonly isExpanded$;
  readonly isHovered$;
  readonly isMobileOpen$;

  constructor() {
    // Empieza a recordar en qué pantalla está la persona, para que «Volver a la aplicación» de Ajustes sepa a dónde volver.
    inject(NavigationHistoryService);
    this.isExpanded$ = this.sidebarService.isExpanded$;
    this.isHovered$ = this.sidebarService.isHovered$;
    this.isMobileOpen$ = this.sidebarService.isMobileOpen$;
  }


}
