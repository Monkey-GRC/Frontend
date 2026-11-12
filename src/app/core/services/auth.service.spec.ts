import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { LanguageService, RELOAD_PAGE } from '@core/services/language.service';
import { environment } from '@environments/environment';
import { AuthPayload, LoginOutcome } from '../models/auth-reponse';
import { AuthService } from './auth.service';

const payload = {
  user: { id: 'u1', email: 'root@monkey.com', role: 'admin_monkey' },
  company: { id: 'c1', name: 'Monkey' },
} as unknown as AuthPayload;
const api = `${environment.apiUrl}/auth`;

describe('AuthService · segundo factor (D94)', () => {
  let service: AuthService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(), provideTranslateService()] });
    service = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('un login con el factor obligatorio no abre sesión: deja el paso pendiente', () => {
    let outcome: LoginOutcome | undefined;
    service.login({ email: 'root@monkey.com', password: 'x' }).subscribe((o) => (outcome = o));
    http.expectOne(`${api}/login`).flush({ status: 200, message: 'ok', data: { next_step: 'mfa_setup', expires_at: '2026-10-26T14:05:00Z' } });

    expect(outcome?.kind).toBe('mfa');
    expect(service.pendingMfa()?.next_step).toBe('mfa_setup');
    expect(service.currentUser).toBeNull();
  });

  it('un login sin segundo factor abre la sesión como siempre', () => {
    let outcome: LoginOutcome | undefined;
    service.login({ email: 'root@monkey.com', password: 'x' }).subscribe((o) => (outcome = o));
    http.expectOne(`${api}/login`).flush({ status: 200, message: 'ok', data: payload });

    expect(outcome?.kind).toBe('session');
    expect(service.currentUser?.email).toBe('root@monkey.com');
  });

  it('verificar el código abre la sesión y limpia el paso pendiente', () => {
    service.pendingMfa.set({ next_step: 'mfa_verify', expires_at: '2026-10-26T14:05:00Z' });
    service.verifyMfa({ code: '123456' }).subscribe();
    http.expectOne(`${api}/mfa/verify`).flush({ status: 200, message: 'ok', data: payload });

    expect(service.pendingMfa()).toBeNull();
    expect(service.currentUser?.email).toBe('root@monkey.com');
  });

  it('al confirmar la configuración la sesión no se guarda hasta ver los códigos de recuperación', () => {
    let codes: string[] | undefined;
    service.confirmMfaSetup('123456').subscribe((p) => (codes = p.recovery_codes));
    http.expectOne(`${api}/mfa/setup/confirm`).flush({ status: 200, message: 'ok', data: { ...payload, recovery_codes: ['AAAAA-BBBBB'] } });

    expect(codes).toEqual(['AAAAA-BBBBB']);
    expect(service.currentUser).toBeNull();

    service.finishMfaSetup(payload).subscribe();
    expect(service.currentUser?.email).toBe('root@monkey.com');
  });
});

describe('AuthService · sin sesión no se consulta al servidor', () => {
  let service: AuthService;
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.removeItem('mk_session');
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(), provideTranslateService()] });
    service = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => {
    http.verify();
    localStorage.removeItem('mk_session');
  });

  it('sin marca de sesión validateSession responde false sin ninguna petición (no hay 401 en consola)', () => {
    let result: boolean | undefined;
    service.validateSession().subscribe((ok) => (result = ok));
    http.expectNone(`${api}/me`);
    expect(result).toBe(false);
  });

  it('con la marca, si me da 401 y el refresh falla pero me responde bien (otra pestaña renovó), la sesión sigue', () => {
    localStorage.setItem('mk_session', '1');
    let result: boolean | undefined;
    service.validateSession().subscribe((ok) => (result = ok));
    http.expectOne(`${api}/me`).flush({ message: 'x' }, { status: 401, statusText: 'Unauthorized' });
    http.expectOne(`${api}/refresh`).flush({ message: 'x' }, { status: 401, statusText: 'Unauthorized' });
    http.expectOne(`${api}/me`).flush({ data: { user: { id: 'u', email: 'a@x.co', role: 'admin_monkey' } } });
    expect(result).toBe(true);
    expect(localStorage.getItem('mk_session')).toBe('1');
  });

  it('con la marca sí pregunta al servidor, y si ya no hay sesión la borra', () => {
    localStorage.setItem('mk_session', '1');
    let result: boolean | undefined;
    service.validateSession().subscribe((ok) => (result = ok));
    http.expectOne(`${api}/me`).flush({ message: 'x' }, { status: 401, statusText: 'Unauthorized' });
    http.expectOne(`${api}/refresh`).flush({ message: 'x' }, { status: 401, statusText: 'Unauthorized' });
    http.expectOne(`${api}/me`).flush({ message: 'x' }, { status: 401, statusText: 'Unauthorized' });
    expect(result).toBe(false);
    expect(localStorage.getItem('mk_session')).toBeNull();
  });
});

describe('AuthService · cierre de sesión y errores del login', () => {
  let service: AuthService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(), provideTranslateService()] });
    service = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('logout clears the session even when the server fails', () => {
    service.login({ email: 'root@monkey.com', password: 'x' }).subscribe();
    http.expectOne(`${api}/login`).flush({ status: 200, message: 'ok', data: payload });
    expect(service.currentUser).not.toBeNull();
    let done = false;
    service.logout().subscribe(() => (done = true));
    http.expectOne(`${api}/logout`).flush({}, { status: 500, statusText: 'Server Error' });
    expect(done).toBeTrue();
    expect(service.currentUser).toBeNull();
    expect(localStorage.getItem('mk_session')).toBeNull();
  });

  it('a 401 from the login reaches the caller untouched and opens no session', () => {
    let status: number | undefined;
    service.login({ email: 'root@monkey.com', password: 'mala' }).subscribe({ error: (e) => (status = e.status) });
    http.expectOne(`${api}/login`).flush({ message: 'x' }, { status: 401, statusText: 'Unauthorized' });
    expect(status).toBe(401);
    expect(service.currentUser).toBeNull();
  });

  it('a 200 without data is a typed error, not a crash', () => {
    let name: string | undefined;
    service.login({ email: 'root@monkey.com', password: 'x' }).subscribe({ error: (e) => (name = e.name) });
    http.expectOne(`${api}/login`).flush({ status: 200, message: 'ok' });
    expect(name).toBe('MissingResponseDataError');
    expect(service.currentUser).toBeNull();
  });
});

describe('AuthService · idioma de la persona (D111)', () => {
  let service: AuthService;
  let http: HttpTestingController;
  let reload: jasmine.Spy;

  beforeEach(() => {
    localStorage.clear();
    reload = jasmine.createSpy('reload');
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideTranslateService({ fallbackLang: 'es' }), { provide: RELOAD_PAGE, useValue: reload }],
    });
    service = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  const loginWith = (preferred: string) => {
    service.login({ email: 'root@monkey.com', password: 'x' }).subscribe();
    http
      .expectOne(`${api}/login`)
      .flush({ status: 200, message: 'ok', data: { ...payload, user: { ...payload.user, preferred_language: preferred } } });
  };

  it('(b) a language chosen in this browser that differs from the account: sends the browser language, no reload', fakeAsync(() => {
    localStorage.setItem('lang', 'en');
    TestBed.inject(LanguageService).current.set('en');
    loginWith('es');
    const req = http.expectOne(`${api}/me/language`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ language: 'en' });
    req.flush(null, { status: 204, statusText: 'No Content' });
    tick(1000);
    expect(reload).not.toHaveBeenCalled();
  }));

  it('(a) no chosen language: the account wins, it is saved as chosen and the app reloads once, with no PATCH', fakeAsync(() => {
    loginWith('en');
    http.expectNone(`${api}/me/language`);
    expect(localStorage.getItem('lang')).toBe('en');
    tick(1000);
    expect(reload).toHaveBeenCalledTimes(1);
  }));

  it('(a) no chosen language and the account matches what is shown: saves it as chosen without reloading', fakeAsync(() => {
    loginWith('es');
    expect(localStorage.getItem('lang')).toBe('es');
    tick(1000);
    expect(reload).not.toHaveBeenCalled();
  }));

  it('no reload loop: after adopting the account language, a new login with the same values does nothing', fakeAsync(() => {
    loginWith('en');
    tick(1000);
    expect(reload).toHaveBeenCalledTimes(1);
    // Tras la recarga la app arranca con lo guardado: el servicio nuevo ya muestra "en" y el navegador tiene idioma elegido.
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideTranslateService({ fallbackLang: 'es' }), { provide: RELOAD_PAGE, useValue: reload }],
    });
    service = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
    loginWith('en');
    http.expectNone(`${api}/me/language`);
    tick(1000);
    expect(reload).toHaveBeenCalledTimes(1);
  }));

  it('a failed sync does not break the login', () => {
    localStorage.setItem('lang', 'en');
    TestBed.inject(LanguageService).current.set('en');
    loginWith('es');
    http.expectOne(`${api}/me/language`).flush({}, { status: 500, statusText: 'Error' });
    expect(service.currentUser?.email).toBe('root@monkey.com');
  });

  describe('restaurar la sesión con /auth/me', () => {
    const restore = (preferred?: string) => {
      localStorage.setItem('mk_session', '1');
      let ok: boolean | undefined;
      service.validateSession().subscribe((v) => (ok = v));
      http
        .expectOne(`${api}/me`)
        .flush({ status: 200, message: 'ok', data: { ...payload, user: { ...payload.user, preferred_language: preferred } } });
      return () => ok;
    };

    it('(a) navegador sin idioma elegido: gana la cuenta, se guarda y recarga una sola vez, sin PATCH', fakeAsync(() => {
      const ok = restore('en');
      http.expectNone(`${api}/me/language`);
      expect(ok()).toBeTrue();
      expect(localStorage.getItem('lang')).toBe('en');
      tick(1000);
      expect(reload).toHaveBeenCalledTimes(1);
    }));

    it('(b) navegador con idioma elegido distinto: PATCH con el del navegador y sin recargar', fakeAsync(() => {
      localStorage.setItem('lang', 'en');
      TestBed.inject(LanguageService).current.set('en');
      restore('es');
      const req = http.expectOne(`${api}/me/language`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({ language: 'en' });
      req.flush(null, { status: 204, statusText: 'No Content' });
      tick(1000);
      expect(reload).not.toHaveBeenCalled();
    }));

    it('(c) /auth/me responde 401: no toca el idioma', fakeAsync(() => {
      localStorage.setItem('mk_session', '1');
      let ok: boolean | undefined;
      service.validateSession().subscribe((v) => (ok = v));
      http.expectOne(`${api}/me`).flush({}, { status: 401, statusText: 'Unauthorized' });
      http.expectOne(`${api}/refresh`).flush({}, { status: 401, statusText: 'Unauthorized' });
      http.expectOne(`${api}/me`).flush({}, { status: 401, statusText: 'Unauthorized' });
      tick(1000);
      expect(ok).toBeFalse();
      http.expectNone(`${api}/me/language`);
      expect(localStorage.getItem('lang')).toBeNull();
      expect(reload).not.toHaveBeenCalled();
    }));
  });
});
