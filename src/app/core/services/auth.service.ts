import { Injectable, inject, signal } from '@angular/core';
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
import {
    AuthPayload,
    AuthPayloadWithRecovery,
    LoginDto,
    LoginOutcome,
    MfaSetupStart,
    MfaStep,
} from '@core/models/auth-reponse';
import { ApiResponse, SuccessResponse } from '@shared/models/api-response.model';
import { unwrapData } from '@shared/domain/utils/unwrap-response';

// Monkey Admin es exclusiva del equipo Monkey (decisión D24): cualquier otro rol se rechaza.
const ADMIN_ROLE = 'admin_monkey';

// Marca (no secreta) de que este navegador abrió una sesión. Las cookies de sesión son httpOnly y el código no las puede ver: sin esta marca, cada
// visita a la pantalla de acceso consultaba /auth/me y llenaba la consola de 401. La marca NO autentica nada: el servidor sigue validando la sesión
// de verdad. Si falta o no se puede leer (modo privado), la app se comporta como antes y pregunta al servidor.
const SESSION_HINT_KEY = 'mk_session';
const readHint = (): boolean => {
  try {
    return localStorage.getItem(SESSION_HINT_KEY) === '1';
  } catch {
    return true;
  }
};
const writeHint = (on: boolean): void => {
  try {
    if (on) localStorage.setItem(SESSION_HINT_KEY, '1');
    else localStorage.removeItem(SESSION_HINT_KEY);
  } catch {
    // sin almacenamiento: se pregunta siempre al servidor
  }
};

@Injectable({ providedIn: 'root' })
export class AuthService {
    private readonly translate = inject(TranslateService);
    private readonly API = environment.apiUrl + '/auth';

    private _isLoggedIn$ = new BehaviorSubject<boolean>(false);
    private _user$ = new BehaviorSubject<User | null>(null);
    // Un solo refresh en vuelo aunque varias peticiones reciban 401 a la vez.
    private refreshInFlight$: Observable<boolean> | null = null;
    // El paso del segundo factor que dejó el login; la pantalla `/auth/mfa` lo lee. Se pierde al recargar (entonces se vuelve a iniciar sesión).
    readonly pendingMfa = signal<MfaStep | null>(null);

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
    login(dto: LoginDto): Observable<LoginOutcome> {
        return this.http.post<SuccessResponse<AuthPayload | MfaStep>>(`${this.API}/login`, dto).pipe(
            unwrapData(),
            switchMap((data) => {
                // Con el segundo factor obligatorio no hay sesión todavía: falta el código (o configurarlo) (D94).
                if ('next_step' in data && 'expires_at' in data) {
                    this.pendingMfa.set(data);
                    return of<LoginOutcome>({ kind: 'mfa', step: data });
                }
                return this.acceptSession(data).pipe(map((user): LoginOutcome => ({ kind: 'session', user })));
            }),
        );
    }

    /** Segundo paso del ingreso: el código de 6 dígitos de la app o uno de recuperación. Abre la sesión. */
    verifyMfa(input: { code: string } | { recovery_code: string }): Observable<User> {
        return this.http.post<SuccessResponse<AuthPayloadWithRecovery>>(`${this.API}/mfa/verify`, input).pipe(
            unwrapData(),
            switchMap((data) => this.acceptSession(data)),
            tap(() => this.pendingMfa.set(null)),
        );
    }

    /** Pide el secreto y la dirección del QR (el mismo mientras el desafío viva). */
    startMfaSetup(): Observable<MfaSetupStart> {
        return this.http.post<SuccessResponse<MfaSetupStart>>(`${this.API}/mfa/setup`, {}).pipe(unwrapData());
    }

    /**
     * Confirma el primer código y activa el factor. El servidor ya abrió la sesión, pero aquí NO se guarda todavía: antes la persona debe ver sus códigos
     * de recuperación (una sola vez); `finishMfaSetup` la deja entrar.
     */
    confirmMfaSetup(code: string): Observable<AuthPayloadWithRecovery> {
        return this.http.post<SuccessResponse<AuthPayloadWithRecovery>>(`${this.API}/mfa/setup/confirm`, { code }).pipe(unwrapData());
    }

    /** Entra a la aplicación una vez guardados los códigos. */
    finishMfaSetup(payload: AuthPayload): Observable<User> {
        return this.acceptSession(payload).pipe(tap(() => this.pendingMfa.set(null)));
    }

    /** Genera 10 códigos de recuperación nuevos (los anteriores dejan de servir). Pide un código vigente de la app. */
    regenerateRecoveryCodes(code: string): Observable<string[]> {
        return this.http
            .post<SuccessResponse<{ recovery_codes: string[] }>>(`${this.API}/mfa/recovery-codes`, { code })
            .pipe(
                unwrapData(),
                map((data) => data.recovery_codes),
            );
    }

    /** «Olvidé mi contraseña»: pide el enlace al correo. Responde igual exista o no la cuenta (D101). */
    forgotPassword(email: string): Observable<void> {
        return this.http.post<void>(`${this.API}/password/forgot`, { email }).pipe(map(() => void 0));
    }

    /** Crea la contraseña nueva con el token del enlace y el segundo factor. Cierra todas las sesiones: después hay que iniciar sesión (D101). */
    resetPassword(input: { token: string; new_password: string; code?: string; recovery_code?: string }): Observable<void> {
        return this.http.post<void>(`${this.API}/password/reset`, input).pipe(map(() => void 0));
    }

    private acceptSession(payload: AuthPayload): Observable<User> {
        const user = payload.user;
        if (user.role !== ADMIN_ROLE) {
            return this.logout().pipe(
                switchMap(() => throwError(() => new Error(this.translate.instant('AUTH.ONLY_MONKEY_TEAM')))),
            );
        }
        this.setSession(user);
        return of(user);
    }

    /**
     * Valida la sesión contra el backend (GET /auth/me). El access token dura 15 min: si ya
     * venció, intenta un refresh y vuelve a consultar sin mirar su resultado (si falló, otra pestaña
     * pudo haberlo hecho y las cookies ya son válidas). La sesión vive hasta 30 min sin actividad y 8 h en total.
     */
    validateSession(): Observable<boolean> {
        // Sin sesión abierta en este navegador no se pregunta al servidor (evita un 401 en cada visita al login).
        if (!this._user$.value && !readHint()) return of(false);
        return this.me().pipe(
            catchError((error: HttpErrorResponse) =>
                error.status === 401
                    ? this.refresh().pipe(switchMap(() => this.me()))
                    : of(false),
            ),
            catchError(() => of(false)),
            tap((ok) => { if (!ok) this.clearSession(); }),
        );
    }

    /** Refresh token (cookie → cookie). Devuelve false si falló; no toca la sesión local: quien llama decide tras reintentar. */
    refresh(): Observable<boolean> {
        if (!this.refreshInFlight$) {
            this.refreshInFlight$ = this.http.post<ApiResponse>(`${this.API}/refresh`, {}).pipe(
                map(() => true),
                catchError(() => of(false)),
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
        writeHint(true);
        this._user$.next(user);
        this._isLoggedIn$.next(true);
    }

    private clearSession() {
        writeHint(false);
        this._user$.next(null);
        this._isLoggedIn$.next(false);
    }
}
