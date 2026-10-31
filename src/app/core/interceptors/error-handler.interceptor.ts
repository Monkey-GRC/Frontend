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
    const errorMessage = sanitizeMessage(getServerErrorMessage(error, translate), translate);

    // Se conserva el status: AuthService lo usa para distinguir un 401 (renovar sesión) del resto. Y, si el backend los manda, el código del error y sus errores por
    // campo (ields, un 422): un formulario los muestra junto a cada campo en vez de un solo mensaje general.
    return throwError(() => Object.assign(new Error(errorMessage), { status: error.status, code: error.error?.error?.code, fields: error.error?.error?.fields }));
}

// El texto que el backend ya trae (viene traducido) manda; si no hay respuesta o no trae mensaje (servidor caído, un proxy, un 502), se dice qué
// pasó con un texto propio. Nunca se muestra un código ni una plantilla sin rellenar.
function getServerErrorMessage(error: HttpErrorResponse, translate: TranslateService): string {
    const body = error.error;
    const fromServer = typeof body?.message === 'string' && body.message.trim() ? body.message : null;
    if (error.status === 0) return translate.instant('COMMON.ERRORS.NETWORK');
    if (error.status === 429) return fromServer ?? translate.instant('COMMON.ERRORS.RATE_LIMIT');
    if (error.status === 502 || error.status === 503 || error.status === 504) return translate.instant('COMMON.ERRORS.UNAVAILABLE');
    if (error.status === 422) return fromServer ?? translate.instant('COMMON.ERRORS.UNPROCESSABLE');
    if (fromServer) return fromServer;
    return translate.instant(error.status >= 500 ? 'COMMON.ERRORS.SERVER' : 'COMMON.ERRORS.UNEXPECTED');
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

