import { TestBed } from '@angular/core/testing';
import { Router, UrlTree, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '@features/auth/services/auth.service';
import { guestGuard } from './guest.guard';

describe('guestGuard', () => {
    async function run(validateSession: () => unknown): Promise<boolean | string> {
        TestBed.configureTestingModule({
            providers: [provideRouter([]), { provide: AuthService, useValue: { validateSession } }],
        });
        const result = await TestBed.runInInjectionContext(() => guestGuard({} as never, {} as never));
        return result instanceof UrlTree ? TestBed.inject(Router).serializeUrl(result) : (result as boolean);
    }

    it('shows the login to someone without a session', async () => {
        expect(await run(() => of(false))).toBeTrue();
    });

    it('sends someone who is already signed in to the home instead of the login', async () => {
        expect(await run(() => of(true))).toBe('/');
    });

    it('shows the login when the session check fails', async () => {
        expect(await run(() => throwError(() => new Error('network')))).toBeTrue();
    });
});
