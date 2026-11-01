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

    // Con la sesión ya cargada en esta pestaña NO se vuelve a preguntar al servidor en cada cambio de pantalla: eso hacía esperar un viaje de red completo antes de abrir
    // cualquier ruta protegida (se notaba al entrar y salir de Ajustes). El guard es solo comodidad: la autorización real es del backend en cada petición, y si la
    // sesión venció, el interceptor renueva o manda al inicio de sesión en la primera llamada que falle.
    if (authService.currentUser) return true;

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
