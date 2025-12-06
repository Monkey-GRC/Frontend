import type { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '@features/auth/services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {

    // Obtener el token del Local Storage
    const token = inject(AuthService).getToken();

    if (token) {
        if (req.url.includes('auth/login') || req.url.includes('auth/refresh-token')) {
            return next(req);
        } else {
            req = req.clone({
                setHeaders: {
                    Authorization: `Bearer ${token}`
                }
            });
        }
        return next(req);
    } else {
        return next(req);
    }
};