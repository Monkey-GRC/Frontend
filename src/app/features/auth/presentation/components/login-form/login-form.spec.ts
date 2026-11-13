import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { Subject, throwError } from 'rxjs';
import { AuthService } from '@core/services/auth.service';
import { LoginOutcome } from '@core/models/auth-reponse';
import { LoginForm } from './login-form';

describe('LoginForm (busy until the answer and the navigation, D116)', () => {
  function setup() {
    const auth = jasmine.createSpyObj<AuthService>('AuthService', ['login']);
    TestBed.configureTestingModule({ imports: [LoginForm], providers: [provideRouter([]), provideTranslateService({ fallbackLang: 'es' }), { provide: AuthService, useValue: auth }] });
    const fixture = TestBed.createComponent(LoginForm);
    fixture.detectChanges();
    fixture.componentInstance.form.setValue({ email: 'ana@acme.co', password: 'secreto', remember: false });
    return { fixture, auth, router: TestBed.inject(Router), el: fixture.nativeElement as HTMLElement };
  }

  it('keeps the button busy while the request runs and does not send twice', () => {
    const { fixture, auth, el } = setup();
    const answer = new Subject<LoginOutcome>();
    auth.login.and.returnValue(answer);
    fixture.componentInstance.submit();
    fixture.componentInstance.submit();
    fixture.detectChanges();
    expect(auth.login).toHaveBeenCalledTimes(1);
    expect(el.querySelector('button[type="submit"]')?.getAttribute('aria-busy')).toBe('true');
    expect(fixture.componentInstance.loading()).toBeTrue();
  });

  it('stays busy until the navigation ends after a successful login', async () => {
    const { fixture, auth, router } = setup();
    const answer = new Subject<LoginOutcome>();
    let finishNavigation!: (ok: boolean) => void;
    spyOn(router, 'navigateByUrl').and.returnValue(new Promise<boolean>((resolve) => (finishNavigation = resolve)));
    auth.login.and.returnValue(answer);
    fixture.componentInstance.submit();
    answer.next({ kind: 'session' } as LoginOutcome);
    expect(fixture.componentInstance.loading()).toBeTrue();
    finishNavigation(true);
    await fixture.whenStable();
    expect(fixture.componentInstance.loading()).toBeFalse();
  });

  it('turns the busy state off and shows the error when the login fails', () => {
    const { fixture, auth } = setup();
    auth.login.and.returnValue(throwError(() => ({ message: 'nope' })));
    fixture.componentInstance.submit();
    expect(fixture.componentInstance.loading()).toBeFalse();
    expect(fixture.componentInstance.errorMsg()).toBe('nope');
  });
});
