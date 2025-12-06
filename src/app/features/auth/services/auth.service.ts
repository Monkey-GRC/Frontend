// src/app/core/services/auth.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, catchError, map, of, switchMap, tap } from 'rxjs';
import { User } from '../models/user';
import { environment } from '@environments/environment';
import { ApiResponse } from '@core/models/api-response';
import { LoginDto, LoginResponse } from '@features/auth/models/auth-reponse';

@Injectable({ providedIn: 'root' })
export class AuthService {
    private readonly TOKEN_KEY = 'access_token';
    private readonly REFRESH_TOKEN_KEY = 'refresh_token';
    private readonly API = environment.apiUrl + '/auth';

    private _isLoggedIn$ = new BehaviorSubject<boolean>(false);
    private _user$ = new BehaviorSubject<User | null>(null);

    /** Observables públicos */
    readonly isLoggedIn$ = this._isLoggedIn$.asObservable();
    readonly user$ = this._user$.asObservable();

    constructor(
        private http: HttpClient
    ) { }

    /** Llamar una vez al arrancar la app (APP_INITIALIZER o en AppComponent) */
    init(): Promise<void> {
        const token = this.getToken();
        if (!token) {
            this._isLoggedIn$.next(false);
            this._user$.next(null);
            return Promise.resolve();
        }
        return this.ensureValidToken().toPromise().then(() => void 0);
    }

    /** Guarda token y propaga estado */
    setToken(token: string | null, refresh_token: string | null) {
        if (token && refresh_token) {
            localStorage.setItem(this.TOKEN_KEY, token);
            localStorage.setItem(this.REFRESH_TOKEN_KEY, refresh_token)
            this._isLoggedIn$.next(true);
        } else {
            localStorage.removeItem(this.TOKEN_KEY);
            this._isLoggedIn$.next(false);
        }
    }

    getToken(): string | null {
        return localStorage.getItem(this.TOKEN_KEY);
    }

    /** Valida contra backend. Si es válido, setea user; si no, limpia. */
    validateToken(): Observable<boolean> {
        return this.http.get<ApiResponse>(`${this.API}/validate`).pipe(
            tap((res) => {
                // backend ya pasó por AuthGuard('jwt'), si llegamos aquí el token es válido
                this._user$.next(res?.data?.user ?? null);
                this._isLoggedIn$.next(true);
            }),
            map(() => true),
            catchError((_err) => {
                // token inválido/expirado
                this.clearSession();
                return of(false);
            })
        );
    }

    /**
     * Asegura que el token actual es válido (consulta /auth/validate si hay token).
     * Devuelve true/false sin lanzar error.
     */
    ensureValidToken(): Observable<boolean> {
        const token = this.getToken();
        if (!token) {
            this.clearSession();
            return of(false);
        }
        // opcional: validación rápida por exp del JWT en cliente
        if (!this.isJwtValidLocal(token)) {
            this.clearSession();
            return of(false);
        }
        // validación contra backend (la que manda)
        return this.validateToken();
    }

    /** Cierra sesión en cliente y (opcionalmente) llama al backend */
    logout(callBackend = true): Observable<boolean> {
        if (!callBackend) {
            this.clearSession();
            return of(true);
        }
        return this.http.delete(`${this.API}/logout`).pipe(
            tap(() => this.clearSession()),
            map(() => true),
            catchError((_err) => {
                this.clearSession();
                return of(true);
            })
        );
    }

    /** Helpers */

    /** Útil para guards sincrónicos (canActivate funciona con boolean | UrlTree | Observable | Promise) */
    isAuthenticatedSync(): boolean {
        const token = this.getToken();
        return !!token && this.isJwtValidLocal(token);
    }

    /** Valida expiración local del JWT (sin llamar backend) */
    private isJwtValidLocal(token: string): boolean {
        try {
            const payload = JSON.parse(atob(token.split('.')[1] || ''));
            const exp = typeof payload?.exp === 'number' ? payload.exp : 0;
            const now = Math.floor(Date.now() / 1000);
            return exp > now;
        } catch {
            return false;
        }
    }

    private clearSession() {
        localStorage.removeItem(this.TOKEN_KEY);
        this._user$.next(null);
        this._isLoggedIn$.next(false);
    }

    login(dto: LoginDto) {
        return this.http.post<LoginResponse>(`${this.API}/login`, dto)
    }
}