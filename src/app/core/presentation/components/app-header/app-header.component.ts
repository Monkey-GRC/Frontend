import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy, inject } from '@angular/core';
import { AsyncPipe, NgClass, NgComponentOutlet } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HelpMenu } from '@core/presentation/components/app-header/help-menu/help-menu';
import { ProfileMenu } from '@core/presentation/components/app-header/profile-menu/profile-menu';
import { SidebarService } from '@core/services/sidebar.service';
import { HEADER_WIDGETS } from '@core/presentation/components/app-header/header-widgets';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    AsyncPipe,
    NgClass,
    NgComponentOutlet,
    RouterModule,
    HelpMenu,
    ProfileMenu,
    TranslatePipe
  ],
  templateUrl: './app-header.component.html',
})
export class AppHeaderComponent implements AfterViewInit, OnDestroy {
  sidebarService = inject(SidebarService);
  // Lo que otras capas piden mostrar en el encabezado (la plantilla es canónica): Admin no provee ninguno, así que queda vacío.
  readonly widgets = inject(HEADER_WIDGETS, { optional: true }) ?? [];

  isApplicationMenuOpen = false;
  readonly isMobileOpen$;

  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;

  constructor() {
    this.isMobileOpen$ = this.sidebarService.isMobileOpen$;
  }

  handleToggle() {
    if (window.innerWidth >= 1280) {
      this.sidebarService.toggleExpanded();
    } else {
      this.sidebarService.toggleMobileOpen();
    }
  }

  toggleApplicationMenu() {
    this.isApplicationMenuOpen = !this.isApplicationMenuOpen;
  }

  ngAfterViewInit() {
    document.addEventListener('keydown', this.handleKeyDown);
  }

  ngOnDestroy() {
    document.removeEventListener('keydown', this.handleKeyDown);
  }

  handleKeyDown = (event: KeyboardEvent) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
      event.preventDefault();
      this.searchInput?.nativeElement.focus();
    }
  };
}
