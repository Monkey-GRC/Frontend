import { TestBed } from '@angular/core/testing';
import { Router, UrlTree, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '@features/auth/services/auth.service';
import { authGuard } from './auth.guard';

describe('authGuard', () => {
  let validateSession: jasmine.Spy;

  function setup(currentUser: object | null, serverSays: boolean): void {
    validateSession = jasmine.createSpy('validateSession').and.returnValue(of(serverSays));
    TestBed.configureTestingModule({ providers: [provideRouter([]), { provide: AuthService, useValue: { currentUser, validateSession } }] });
  }

  const run = async (url = '/companies'): Promise<boolean | string> => {
    const result = await TestBed.runInInjectionContext(() => authGuard({} as never, { url } as never));
    return result instanceof UrlTree ? TestBed.inject(Router).serializeUrl(result) : result;
  };

  it('lets a loaded session through at once, without waiting for a round trip to the server', async () => {
    setup({ id: 'u1' }, false);
    expect(await run()).toBeTrue();
    expect(validateSession).not.toHaveBeenCalled();
  });

  it('asks the server when there is no session in memory (a fresh load) and lets a valid one in', async () => {
    setup(null, true);
    expect(await run()).toBeTrue();
    expect(validateSession).toHaveBeenCalledTimes(1);
  });

  it('sends someone with no valid session to the login, remembering where they were going', async () => {
    setup(null, false);
    expect(await run('/companies')).toBe('/auth/login?returnUrl=%2Fcompanies');
  });
});
