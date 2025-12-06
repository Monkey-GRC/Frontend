import type { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, Observable, throwError } from 'rxjs';

export const errorHandlerInterceptor: HttpInterceptorFn = (req, next) => {
    return next(req).pipe(
        catchError((error: HttpErrorResponse) => handleHttpError(error))
    );
};

function handleHttpError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = '';

    if (error.error instanceof ErrorEvent) {
        errorMessage = `${error.error.message}`;
    } else {
        errorMessage = getServerErrorMessage(error);
    }

    return throwError(() => new Error(errorMessage));
}

function getServerErrorMessage(error: HttpErrorResponse): string {
    switch (error.status) {
        case 400: return `${error.error.message}`;
        case 401: return `${error.error.message}`;
        case 403: return `${error.error.message}`;
        case 404: return `${error.error.message}`;
        case 422: return `Entidad no procesable`;
        case 500: return `${error.error.message}`;
        default: return `Error inesperado: ${error.error.message}`;
    }
}

