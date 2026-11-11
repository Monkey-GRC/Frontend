import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '@core/services/auth.service';

// El inverso de `authGuard`: la pantalla para quien NO ha entrado (inicio de sesión). Con una sesión válida no se muestra: se vuelve al
// home, así «atrás» o «adelante» del navegador no devuelven al login estando dentro.
export const guestGuard: CanActivateFn = async () => {
    const authService = inject(AuthService);
    const router = inject(Router);

    try {
        if (await firstValueFrom(authService.validateSession())) {
            return router.createUrlTree(['/']);
        }
    } catch {
        // sin sesión válida → se muestra el login
    }
    return true;
};