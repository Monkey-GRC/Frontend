import type { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => {

    const lang = localStorage.getItem('lang') || 'es';

    // Endpoints públicos (no requieren auth)
    const isPublic =
        req.url.includes('/auth/login') ||
        req.url.includes('/auth/refresh');

    const cloned = req.clone({
        withCredentials: true, // ✅ ENVÍA COOKIES httpOnly
        setHeaders: {
            'Accept-Language': lang,
        },
    });

    return next(cloned);
};
