import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { AuthService } from '@core/services/auth.service';
import { roleGuard } from './role.guard';

describe('roleGuard', () => {
  const run = (...roles: string[]) => TestBed.runInInjectionContext(() => roleGuard(roles)({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot));

  beforeEach(() =>
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([]), provideTranslateService()] }),
  );

  it('lets the allowed role in', () => {
    spyOnProperty(TestBed.inject(AuthService), 'currentUser').and.returnValue({ role: 'admin_monkey' } as never);
    expect(run('admin_monkey')).toBeTrue();
  });

  it('sends a role that is not allowed, or a visitor without a session, to the start', () => {
    const auth = TestBed.inject(AuthService);
    const user = spyOnProperty(auth, 'currentUser');
    user.and.returnValue({ role: 'funcional' } as never);
    expect(TestBed.inject(Router).serializeUrl(run('admin_monkey') as UrlTree)).toBe('/');
    user.and.returnValue(null);
    expect(TestBed.inject(Router).serializeUrl(run('admin_monkey') as UrlTree)).toBe('/');
  });
});
