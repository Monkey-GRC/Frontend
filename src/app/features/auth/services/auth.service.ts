import { firstValueFrom } from 'rxjs';
// src/app/core/services/auth.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, catchError, map, of, tap } from 'rxjs';
import { User } from '../models/user';
import { environment } from '@environments/environment';
import { LoginDto } from '@features/auth/models/auth-reponse';
import { ApiResponse, SuccessResponse } from '@shared/models/api-response.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
    private readonly API = environment.apiUrl + '/auth';

    private _isLoggedIn$ = new BehaviorSubject<boolean>(false);
    private _user$ = new BehaviorSubject<User | null>(null);

    /** Observables públicos */
    readonly isLoggedIn$ = this._isLoggedIn$.asObservable();
    readonly user$ = this._user$.asObservable();

    /** Snapshot síncrono del usuario logueado (poblado tras validateSession) */
    get currentUser(): User | null {
        return this._user$.value;
    }

    constructor(private http: HttpClient) { }

    /**
     * Llamar al iniciar la app (APP_INITIALIZER o AppComponent)
     * Consulta al backend si la cookie es válida
     */
    init(): Promise<void> {
        return firstValueFrom(this.validateSession()
            .pipe(map(() => void 0)));
    }

    /**
     * Login
     * El backend setea cookies httpOnly
     */
    login(dto: LoginDto) {
        return this.http.post<ApiResponse>(
            `${this.API}/login`,
            dto,
            { withCredentials: true } // 👈 CRÍTICO
        ).pipe(
            tap(() => {
                this._isLoggedIn$.next(true);
            })
        );
    }

    /**
     * Valida la sesión actual contra backend
     * (/auth/validate protegido con AuthGuard)
     */
    validateSession(): Observable<boolean> {
        return this.http.get<ApiResponse>(
            `${this.API}/validate`,
            { withCredentials: true } // 👈 CRÍTICO
        ).pipe(
            tap((res: SuccessResponse) => {
                this._user$.next(res?.data?.user ?? null);
                this._isLoggedIn$.next(true);
            }),
            map(() => true),
            catchError(() => {
                this.clearSession();
                return of(false);
            })
        );
    }

    /**
     * Refresh token (cookie → cookie)
     */
    refresh(): Observable<boolean> {
        return this.http.post<ApiResponse>(
            `${this.API}/refresh`,
            {},
            { withCredentials: true }
        ).pipe(
            tap(() => this._isLoggedIn$.next(true)),
            map(() => true),
            catchError(() => {
                this.clearSession();
                return of(false);
            })
        );
    }

    /**
     * Logout
     */
    logout(): Observable<boolean> {
        return this.http.delete(
            `${this.API}/logout`,
            { withCredentials: true }
        ).pipe(
            tap(() => this.clearSession()),
            map(() => true),
            catchError(() => {
                this.clearSession();
                return of(true);
            })
        );
    }

    /** Limpia estado local */
    private clearSession() {
        this._user$.next(null);
        this._isLoggedIn$.next(false);
    }
}
