import { Routes } from '@angular/router';
import { Login } from '@features/auth/presentation/views/login/login';
import { Mfa } from '@features/auth/presentation/views/mfa/mfa';
import { ForgotPassword } from '@features/auth/presentation/views/forgot-password/forgot-password';
import { ResetPassword } from '@features/auth/presentation/views/reset-password/reset-password';
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
        title: 'PAGE_TITLE.HOME',
        component: Home,
        pathMatch: 'full',
      },
      {
        path: 'companies',
        title: 'PAGE_TITLE.COMPANIES',
        loadComponent: () => import('src/app/features/companies/presentation/views/companies/companies').then(m => m.Companies),
        canActivate: [roleGuard(['admin_monkey'])],
        pathMatch: 'full',
      },
      {
        path: 'catalog',
        title: 'PAGE_TITLE.CATALOG',
        loadComponent: () => import('src/app/features/catalog/presentation/views/catalog/catalog').then(m => m.Catalog),
        canActivate: [roleGuard(['admin_monkey'])],
        pathMatch: 'full',
      },
      {
        path: 'users',
        title: 'PAGE_TITLE.USERS',
        loadComponent: () => import('src/app/features/users/presentation/views/users/users').then(m => m.Users),
        canActivate: [roleGuard(['admin_monkey'])],
        pathMatch: 'full',
      },
    ]
  },
  // Ajustes (desde el menú de perfil): una pantalla completa FUERA del layout de la app (sin su menú ni su encabezado), con «Volver a la aplicación». Menú por función a la
  // izquierda y la sección a la derecha; hoy, Seguridad (contraseña y códigos de recuperación; D101, SEG-14). Es una ruta real, en la misma pestaña.
  {
    path: 'ajustes',
    canActivate: [authGuard],
    loadComponent: () => import('src/app/features/settings/presentation/views/settings-shell/settings-shell').then(m => m.SettingsShellView),
    children: [
      { path: '', redirectTo: 'seguridad', pathMatch: 'full' },
      // Cada sección es un resumen con sus categorías; las opciones con «>» abren su detalle (con «← Atrás»). Las rutas más específicas van antes.
      {
        path: 'seguridad/contrasena',
        title: 'PAGE_TITLE.SETTINGS_PASSWORD',
        loadComponent: () => import('src/app/features/settings/presentation/views/password/password').then(m => m.PasswordSettingsView),
      },
      {
        path: 'seguridad/codigos-de-recuperacion',
        title: 'PAGE_TITLE.SETTINGS_RECOVERY',
        loadComponent: () => import('src/app/features/settings/presentation/views/recovery-codes/recovery-codes').then(m => m.RecoveryCodesSettingsView),
      },
      {
        path: 'seguridad',
        title: 'PAGE_TITLE.SETTINGS_SECURITY',
        loadComponent: () => import('src/app/features/settings/presentation/views/security/security').then(m => m.SecurityView),
      },
    ],
  },
  // auth pages
  {
    path: 'auth/mfa',
    title: 'PAGE_TITLE.MFA',
    component: Mfa,
    canActivate: [guestGuard],
  },
  {
    path: 'auth/login',
    title: 'PAGE_TITLE.LOGIN',
    component: Login,
    canActivate: [guestGuard],
  },
  // Recuperar la contraseña (D101): se puede pedir con o sin sesión (Ajustes lo ofrece a quien ya entró) y el enlace del correo abre `auth/reset-password`, que también sirve con o sin sesión.
  {
    path: 'auth/forgot-password',
    title: 'PAGE_TITLE.FORGOT_PASSWORD',
    component: ForgotPassword,
  },
  {
    path: 'auth/reset-password',
    title: 'PAGE_TITLE.RESET_PASSWORD',
    component: ResetPassword,
  },
  // error pages
  {
    path: '**',
    title: 'PAGE_TITLE.NOT_FOUND',
    component: NotFoundLayout
  },
];
