import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '@environments/environment';
import { CompanyService } from './company.service';

describe('CompanyService · cupo de usuarios (D103)', () => {
  let service: CompanyService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(CompanyService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('changes the quota with PATCH /companies/{id}/max-users and only that field', () => {
    service.updateMaxUsers('co-1', 25).subscribe();
    const req = http.expectOne(`${environment.apiUrl}/companies/co-1/max-users`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ max_users: 25 });
    req.flush({ statusCode: 200, message: '', data: {} });
  });

  it('registers a company with the contracted users', () => {
    service.createCompany({ name: 'ACME', admin_email: 'a@acme.co', requires_dedicated_database: false, framework_codes: ['soc2'], max_users: 10 }).subscribe();
    const req = http.expectOne(`${environment.apiUrl}/companies`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body.max_users).toBe(10);
    req.flush({ statusCode: 201, message: '', data: {} });
  });

  it('the registration form asks for the quota: required, a whole number, 1 or more', () => {
    service.initializeForm();
    const control = service.form.controls['max_users'];
    expect(control.valid).toBeFalse(); // vacío
    for (const bad of [0, -3, 2.5]) {
      control.setValue(bad);
      expect(control.valid).withContext(String(bad)).toBeFalse();
    }
    control.setValue(1);
    expect(control.valid).toBeTrue();
    control.setValue(250);
    expect(control.valid).toBeTrue();
  });
});
