import type { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '@core/services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
    const router = inject(Router);
    const authService = inject(AuthService);

    const lang = localStorage.getItem('lang') || 'es';

    // Endpoints de auth: su 401 lo maneja AuthService, no este interceptor.
    const isAuthEndpoint = /\/auth\/(login|refresh|logout|me|mfa\/(verify|setup|setup\/confirm|recovery-codes))$/.test(req.url);

    const cloned = req.clone({
        withCredentials: true, // ✅ ENVÍA COOKIES httpOnly
        setHeaders: {
            'Accept-Language': lang,
        },
    });

    return next(cloned).pipe(
        catchError((error: HttpErrorResponse) => {
            if (error.status !== 401 || isAuthEndpoint) return throwError(() => error);

            // El access token dura 15 min: ante un 401 se renueva una vez y se reintenta.
            // Si la sesión ya no se puede renovar (30 min sin actividad, 8 h, o la cookie fue
            // pisada por otra app en localhost), se limpia y se manda a loguear de nuevo.
            return authService.refresh().pipe(
                switchMap((ok) => {
                    if (ok) return next(cloned);
                    authService.clearLocalSession();
                    router.navigate(['/auth/login']);
                    return throwError(() => error);
                }),
            );
        }),
    );
};
