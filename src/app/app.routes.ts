import { Routes } from '@angular/router';
import { Login } from '@features/auth/presentation/views/login/login';
import { Mfa } from '@features/auth/presentation/views/mfa/mfa';
import { NotFoundLayout } from '@core/presentation/pages/not-found-layout/not-found-layout';
import { Home } from '@features/common/presentation/view/home/home';
import { AppLayoutComponent } from '@core/presentation/pages/app-layout/app-layout.component';
import { authGuard } from '@core/guards/auth.guard';
import { roleGuard } from '@core/guards/role.guard';
import { guestGuard } from '@core/guards/guest.guard';

export const routes: Routes = [
  {
    path: '',
    component: AppLayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        component: Home,
        pathMatch: 'full',
      },
      {
        path: 'companies',
        loadComponent: () => import('src/app/features/companies/presentation/views/companies/companies').then(m => m.Companies),
        canActivate: [roleGuard(['admin_monkey'])],
        pathMatch: 'full',
      },
      {
        path: 'catalog',
        loadComponent: () => import('src/app/features/catalog/presentation/views/catalog/catalog').then(m => m.Catalog),
        canActivate: [roleGuard(['admin_monkey'])],
        pathMatch: 'full',
      },
      {
        path: 'users',
        loadComponent: () => import('src/app/features/users/presentation/views/users/users').then(m => m.Users),
        canActivate: [roleGuard(['admin_monkey'])],
        pathMatch: 'full',
      },

    ]
  },
  // auth pages
  {
    path: 'auth/mfa',
    component: Mfa,
    canActivate: [guestGuard],
  },
  {
    path: 'auth/login',
    component: Login,
    canActivate: [guestGuard],
  },
  // error pages
  {
    path: '**',
    component: NotFoundLayout
  },
];
