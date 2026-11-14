import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '@environments/environment';
import { AdminUserService } from './admin-user.service';
import { adminErrorKey, daysUntilPurge } from './admin-user.utils';

describe('AdminUserService (D117)', () => {
  let service: AdminUserService;
  let http: HttpTestingController;
  const url = `${environment.apiUrl}/admins`;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(AdminUserService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('lists with page, size, sort and the status filter only when there is one', () => {
    service.list({ page: 2, pageSize: 25, sort: 'email', status: 'inactive' }).subscribe();
    const req = http.expectOne((r) => r.url === url);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('page')).toBe('2');
    expect(req.request.params.get('sort')).toBe('email');
    expect(req.request.params.get('status')).toBe('inactive');
    req.flush({ statusCode: 200, message: '', data: {} });

    service.list({ page: 1, pageSize: 25, sort: '-created_at', status: '' }).subscribe();
    const plain = http.expectOne((r) => r.url === url);
    expect(plain.request.params.has('status')).toBeFalse();
    plain.flush({ statusCode: 200, message: '', data: {} });
  });

  it('invites with POST /admins and the code of whoever invites', () => {
    const body = { email: 'a@monkey.example', name: 'Ana', last_name: 'Ruiz', role: 'admin_monkey' as const, totp_code: '123456' };
    service.invite(body).subscribe();
    const req = http.expectOne(url);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush({ statusCode: 201, message: '', data: {} });
  });

  it('resends the invitation with no body, deactivates with the code and reactivates WITHOUT it', () => {
    service.resendInvitation('a1').subscribe();
    const resend = http.expectOne(`${url}/a1/activation-code`);
    expect(resend.request.method).toBe('POST');
    resend.flush({ statusCode: 200, message: '', data: {} });

    service.deactivate('a1', '654321').subscribe();
    const off = http.expectOne(`${url}/a1/deactivation`);
    expect(off.request.body).toEqual({ totp_code: '654321' });
    off.flush({ statusCode: 200, message: '', data: {} });

    service.reactivate('a1').subscribe();
    const on = http.expectOne(`${url}/a1/reactivation`);
    expect(on.request.body).toEqual({});
    on.flush({ statusCode: 200, message: '', data: {} });
  });
});

describe('admin-user utils', () => {
  it('counts the days to the purge, never below 0, and says nothing without a date', () => {
    const now = new Date('2026-11-13T12:00:00Z').getTime();
    expect(daysUntilPurge('2026-11-20T12:00:00Z', now)).toBe(7);
    expect(daysUntilPurge('2026-11-13T18:00:00Z', now)).toBe(1);
    expect(daysUntilPurge('2026-11-01T00:00:00Z', now)).toBe(0);
    expect(daysUntilPurge(null, now)).toBeNull();
  });

  it('only contract codes get their own text', () => {
    expect(adminErrorKey('LAST_ADMIN')).toBe('ADMIN_USERS.ERRORS.LAST_ADMIN');
    expect(adminErrorKey('SOMETHING_ELSE')).toBeNull();
    expect(adminErrorKey(undefined)).toBeNull();
  });
});
