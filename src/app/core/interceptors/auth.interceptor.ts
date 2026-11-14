import type { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '@core/services/auth.service';

// Un 401 por el código del segundo factor de una acción sensible NO es una sesión caducada: no se renueva, no se reintenta (gastaría otro intento) y no se cierra la sesión.
const SECOND_FACTOR_CODES = ['MFA_CODE_INVALID', 'MFA_NOT_ENABLED'];

export const authInterceptor: HttpInterceptorFn = (req, next) => {
    const router = inject(Router);
    const authService = inject(AuthService);

    const lang = localStorage.getItem('lang') || 'es';

    // Endpoints de auth: su 401 lo maneja AuthService, no este interceptor.
    const isAuthEndpoint = /\/auth\/(login|refresh|logout|me|mfa\/(verify|setup|setup\/confirm|recovery-codes))$/.test(req.url);

    // `X-Monkey-Client` elige qué juego de cookies usa el servidor para que Admin y Platform convivan en un mismo
    // navegador; no autentica nada.
    const cloned = req.clone({
        withCredentials: true, // ✅ ENVÍA COOKIES httpOnly
        setHeaders: {
            'Accept-Language': lang,
            'X-Monkey-Client': 'admin',
        },
    });

    return next(cloned).pipe(
        catchError((error: HttpErrorResponse) => {
            if (error.status !== 401 || isAuthEndpoint) return throwError(() => error);
            if (SECOND_FACTOR_CODES.includes(error.error?.error?.code)) return throwError(() => error);

            // El access token dura 15 min: ante un 401 se intenta renovar y se reintenta UNA vez, pase lo que
            // pase con la renovación: si falló, otra pestaña pudo rotar el refresh token y el navegador ya tiene
            // cookies nuevas. Solo si el reintento también responde 401 (30 min sin actividad, 8 h, o la cookie
            // fue pisada por otra app en localhost) se limpia la sesión y se manda a loguear de nuevo.
            return authService.refresh().pipe(
                switchMap(() => next(cloned)),
                catchError((retryError: HttpErrorResponse) => {
                    if (retryError.status === 401) {
                        authService.clearLocalSession();
                        router.navigate(['/auth/login']);
                    }
                    return throwError(() => retryError);
                }),
            );
        }),
    );
};
