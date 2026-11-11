import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { environment } from '@environments/environment';
import { AuthService } from '@core/services/auth.service';
import { authInterceptor } from './auth.interceptor';

const api = environment.apiUrl;

describe('authInterceptor', () => {
  let http: HttpClient;
  let backend: HttpTestingController;
  let auth: AuthService;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting(), provideRouter([]), provideTranslateService()],
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
  });
  afterEach(() => backend.verify());

  it('sends the cookies and the chosen language with every request', () => {
    http.get(`${api}/companies`).subscribe();
    const req = backend.expectOne(`${api}/companies`);
    expect(req.request.withCredentials).toBeTrue();
    expect(req.request.headers.has('Accept-Language')).toBeTrue();
    req.flush({});
  });

  it('on a 401 renews the session once and retries the request', () => {
    let body: unknown;
    http.get(`${api}/companies`).subscribe((b) => (body = b));
    backend.expectOne(`${api}/companies`).flush({}, { status: 401, statusText: 'Unauthorized' });
    backend.expectOne(`${api}/auth/refresh`).flush({});
    backend.expectOne(`${api}/companies`).flush({ ok: true });
    expect(body).toEqual({ ok: true });
  });

  it('when the session cannot be renewed it clears it and goes to the login', () => {
    const navigate = spyOn(router, 'navigate').and.resolveTo(true);
    const clear = spyOn(auth, 'clearLocalSession').and.callThrough();
    let failed = false;
    http.get(`${api}/companies`).subscribe({ error: () => (failed = true) });
    backend.expectOne(`${api}/companies`).flush({}, { status: 401, statusText: 'Unauthorized' });
    backend.expectOne(`${api}/auth/refresh`).flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(failed).toBeTrue();
    expect(clear).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith(['/auth/login']);
  });

  it('does not try to renew when the 401 comes from an auth endpoint', () => {
    let failed = false;
    http.post(`${api}/auth/login`, {}).subscribe({ error: () => (failed = true) });
    backend.expectOne(`${api}/auth/login`).flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(failed).toBeTrue();
  });
});
