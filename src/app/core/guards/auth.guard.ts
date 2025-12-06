import { inject } from '@angular/core';
import { Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '@features/auth/services/auth.service';
import { firstValueFrom } from 'rxjs';

export const authGuard = async (
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    // 1) Chequeo rápido local
    if (authService.isAuthenticatedSync()) return true;

    // 2) Validación contra backend
    try {
        const ok = await firstValueFrom(authService.ensureValidToken());
        if (ok) return true;
    } catch { /* ignore */ }

    // 3) Redirección a login
    const isRoot = state.url === '/' || state.url === '' || state.url === '/home'; // ajusta si tu inicio es /home
    const isLogin = state.url.startsWith('/auth/login');

    // Solo pasa returnUrl si NO es inicio y NO es /auth/login
    return isRoot || isLogin
        ? router.createUrlTree(['/auth/login'])
        : router.createUrlTree(['/auth/login'], { queryParams: { returnUrl: state.url } });
};