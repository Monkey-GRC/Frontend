import type { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '@features/auth/services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
    const router = inject(Router);
    const authService = inject(AuthService);

    const lang = localStorage.getItem('lang') || 'es';

    // Endpoints públicos (no requieren auth)
    const isPublic =
        req.url.includes('/auth/login') ||
        req.url.includes('/auth/refresh') ||
        req.url.includes('/auth/validate');

    const cloned = req.clone({
        withCredentials: true, // ✅ ENVÍA COOKIES httpOnly
        setHeaders: {
            'Accept-Language': lang,
        },
    });

    return next(cloned).pipe(
        catchError((error: HttpErrorResponse) => {
            // Un 401 en cualquier request autenticado (sesión vencida, o la
            // cookie fue pisada por otra pestaña con otra sesión — las apps
            // de Monkey comparten cookie jar en localhost al no diferir en
            // dominio, solo en puerto) deja a la app en un estado roto si no
            // se limpia y se manda a loguear de nuevo.
            if (error.status === 401 && !isPublic) {
                authService.clearLocalSession();
                router.navigate(['/auth/login']);
            }
            return throwError(() => error);
        }),
    );
};
