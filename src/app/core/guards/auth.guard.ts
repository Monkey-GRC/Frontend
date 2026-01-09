import { inject } from '@angular/core';
import {
    ActivatedRouteSnapshot,
    Router,
    RouterStateSnapshot,
    UrlTree
} from '@angular/router';
import { AuthService } from '@features/auth/services/auth.service';
import { firstValueFrom } from 'rxjs';

export const authGuard = async (
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
): Promise<boolean | UrlTree> => {

    const authService = inject(AuthService);
    const router = inject(Router);

    try {
        // 🔐 Validación real contra backend (/auth/validate)
        const isValid = await firstValueFrom(authService.validateSession());

        if (isValid) {
            return true;
        }
    } catch {
        // ignore → redirigir
    }

    // ⛔ No autenticado → login
    const isLogin = state.url.startsWith('/auth/login');
    const isRoot = state.url === '/' || state.url === '' || state.url === '/home';

    if (isLogin || isRoot) {
        return router.createUrlTree(['/auth/login']);
    }

    // 🔁 Redirige conservando returnUrl
    return router.createUrlTree(
        ['/auth/login'],
        { queryParams: { returnUrl: state.url } }
    );
};
