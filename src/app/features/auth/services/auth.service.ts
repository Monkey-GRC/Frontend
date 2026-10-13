import { Injectable, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import {
    BehaviorSubject,
    Observable,
    catchError,
    finalize,
    firstValueFrom,
    map,
    of,
    shareReplay,
    switchMap,
    tap,
    throwError,
} from 'rxjs';
import { User } from '../models/user';
import { environment } from '@environments/environment';
import { AuthPayload, LoginDto } from '@features/auth/models/auth-reponse';
import { ApiResponse, SuccessResponse } from '@shared/models/api-response.model';

// Monkey Admin es exclusiva del equipo Monkey (decisión D24): cualquier otro rol se rechaza.
const ADMIN_ROLE = 'admin_monkey';

@Injectable({ providedIn: 'root' })
export class AuthService {
    private readonly translate = inject(TranslateService);
    private readonly API = environment.apiUrl + '/auth';

    private _isLoggedIn$ = new BehaviorSubject<boolean>(false);
    private _user$ = new BehaviorSubject<User | null>(null);
    // Un solo refresh en vuelo aunque varias peticiones reciban 401 a la vez.
    private refreshInFlight$: Observable<boolean> | null = null;

    /** Observables públicos */
    readonly isLoggedIn$ = this._isLoggedIn$.asObservable();
    readonly user$ = this._user$.asObservable();

    /** Snapshot síncrono del usuario logueado (poblado tras validateSession) */
    get currentUser(): User | null {
        return this._user$.value;
    }

    constructor(private http: HttpClient) { }

    init(): Promise<void> {
        return firstValueFrom(this.validateSession().pipe(map(() => void 0)));
    }

    /**
     * Login. El backend setea las cookies httpOnly; si el usuario no es admin_monkey se cierra
     * esa sesión de inmediato y se informa el error.
     */
    login(dto: LoginDto): Observable<User> {
        return this.http.post<SuccessResponse<AuthPayload>>(`${this.API}/login`, dto).pipe(
            switchMap((res) => {
                const user = res.data!.user;
                if (user.role !== ADMIN_ROLE) {
                    return this.logout().pipe(
                        switchMap(() =>
                            throwError(() => new Error(this.translate.instant('AUTH.ONLY_MONKEY_TEAM'))),
                        ),
                    );
                }
                this.setSession(user);
                return of(user);
            }),
        );
    }

    /**
     * Valida la sesión contra el backend (GET /auth/me). El access token dura 15 min: si ya
     * venció, intenta un refresh (la sesión vive hasta 30 min sin actividad y 8 h en total).
     */
    validateSession(): Observable<boolean> {
        return this.me().pipe(
            catchError((error: HttpErrorResponse) =>
                error.status === 401
                    ? this.refresh().pipe(switchMap((ok) => (ok ? this.me() : of(false))))
                    : of(false),
            ),
            catchError(() => of(false)),
            tap((ok) => { if (!ok) this.clearSession(); }),
        );
    }

    /** Refresh token (cookie → cookie). Devuelve false si la sesión ya no se puede renovar. */
    refresh(): Observable<boolean> {
        if (!this.refreshInFlight$) {
            this.refreshInFlight$ = this.http.post<ApiResponse>(`${this.API}/refresh`, {}).pipe(
                map(() => true),
                catchError(() => {
                    this.clearSession();
                    return of(false);
                }),
                finalize(() => (this.refreshInFlight$ = null)),
                shareReplay(1),
            );
        }
        return this.refreshInFlight$;
    }

    /** Logout */
    logout(): Observable<boolean> {
        return this.http.post(`${this.API}/logout`, {}).pipe(
            map(() => true),
            catchError(() => of(true)),
            tap(() => this.clearSession()),
        );
    }

    /** Limpia estado local (ej. tras un 401 inesperado en cualquier request) */
    clearLocalSession() {
        this.clearSession();
    }

    private me(): Observable<boolean> {
        return this.http.get<SuccessResponse<AuthPayload>>(`${this.API}/me`).pipe(
            map((res) => {
                const user = res.data?.user;
                if (!user || user.role !== ADMIN_ROLE) return false;
                this.setSession(user);
                return true;
            }),
        );
    }

    private setSession(user: User) {
        this._user$.next(user);
        this._isLoggedIn$.next(true);
    }

    private clearSession() {
        this._user$.next(null);
        this._isLoggedIn$.next(false);
    }
}
