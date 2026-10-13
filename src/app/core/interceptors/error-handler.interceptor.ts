import type { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { catchError, Observable, throwError } from 'rxjs';

export const errorHandlerInterceptor: HttpInterceptorFn = (req, next) => {
    const translate = inject(TranslateService);
    return next(req).pipe(
        catchError((error: HttpErrorResponse) => handleHttpError(error, translate))
    );
};

function handleHttpError(error: HttpErrorResponse, translate: TranslateService): Observable<never> {
    let errorMessage = '';

    if (error.error instanceof ErrorEvent) {
        errorMessage = `${error.error.message}`;
    } else {
        errorMessage = sanitizeMessage(getServerErrorMessage(error, translate), translate);
    }

    // Se conserva el status: AuthService lo usa para distinguir un 401 (renovar sesión) del resto.
    return throwError(() => Object.assign(new Error(errorMessage), { status: error.status }));
}

function getServerErrorMessage(error: HttpErrorResponse, translate: TranslateService): string {
    switch (error.status) {
        case 400: return `${error.error.message}`;
        case 401: return `${error.error.message}`;
        case 403: return `${error.error.message}`;
        case 404: return `${error.error.message}`;
        case 409: return `${error.error.message}`;
        case 422: return error.error?.message ?? translate.instant('COMMON.ERRORS.UNPROCESSABLE');
        case 500: return `${error.error.message}`;
        default: return translate.instant('COMMON.ERRORS.UNEXPECTED', { message: error.error.message });
    }
}

/**
 * mnk-client-identifier/mnk-client-key son un detalle interno de enrutamiento
 * entre tenants (ver ClientCredentialsGuard) — MONKEY_ADMIN nunca los usa y
 * nunca deben llegar a un humano, sea admin o cliente. Si por cualquier causa
 * (bug, estado inconsistente) el backend responde con uno de esos mensajes,
 * se reemplaza por uno genérico antes de que cualquier toast lo muestre.
 */
const INTERNAL_ROUTING_MESSAGE_PATTERN = /mnk-client-(identifier|key)|credenciales de tenant/i;

function sanitizeMessage(message: string, translate: TranslateService): string {
    if (INTERNAL_ROUTING_MESSAGE_PATTERN.test(message)) {
        return translate.instant('COMMON.ERRORS.AUTH_PROBLEM');
    }
    return message;
}

