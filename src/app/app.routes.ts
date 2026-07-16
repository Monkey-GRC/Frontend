import { Routes } from '@angular/router';
import { Login } from '@features/auth/presentation/views/login/login';
import { NotFoundLayout } from '@core/presentation/pages/not-found-layout/not-found-layout';
import { Home } from '@features/common/presentation/view/home/home';
import { AppLayoutComponent } from '@core/presentation/pages/app-layout/app-layout.component';
import { authGuard } from '@core/guards/auth.guard';

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
        path: 'risks',
        loadComponent: () => import('src/app/features/grc-framework/presentation/views/risks/risks').then(m => m.Risks),
        pathMatch: 'full',
      },
      {
        path: 'reasons',
        loadComponent:() => import('src/app/features/grc-framework/presentation/views/reasons/reasons').then(m => m.Reasons ),
        pathMatch: 'full',
      },
      {
        path: 'controls',
        loadComponent: () => import('src/app/features/grc-framework/presentation/views/controls/controls').then(m => m.Controls),
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
