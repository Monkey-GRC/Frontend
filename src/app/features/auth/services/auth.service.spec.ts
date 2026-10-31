import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
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

  it('con la marca sí pregunta al servidor, y si ya no hay sesión la borra', () => {
    localStorage.setItem('mk_session', '1');
    let result: boolean | undefined;
    service.validateSession().subscribe((ok) => (result = ok));
    http.expectOne(`${api}/me`).flush({ message: 'x' }, { status: 401, statusText: 'Unauthorized' });
    http.expectOne(`${api}/refresh`).flush({ message: 'x' }, { status: 401, statusText: 'Unauthorized' });
    expect(result).toBe(false);
    expect(localStorage.getItem('mk_session')).toBeNull();
  });
});
