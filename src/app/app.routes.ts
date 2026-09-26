import { Routes } from '@angular/router';
import { Login } from '@features/auth/presentation/views/login/login';
import { NotFoundLayout } from '@core/presentation/pages/not-found-layout/not-found-layout';
import { Home } from '@features/common/presentation/view/home/home';
import { AppLayoutComponent } from '@core/presentation/pages/app-layout/app-layout.component';
import { authGuard } from '@core/guards/auth.guard';
import { roleGuard } from '@core/guards/role.guard';

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
        path: 'users',
        loadComponent: () => import('src/app/features/users/presentation/views/users/users').then(m => m.Users),
        canActivate: [roleGuard(['MONKEY_ADMIN'])],
        pathMatch: 'full',
      },

    ]
  },
  // auth pages
  {
    path: 'auth/login',
    component: Login
  },
  // error pages
  {
    path: '**',
    component: NotFoundLayout
  },
];
