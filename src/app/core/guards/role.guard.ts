import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '@core/services/auth.service';

export const roleGuard = (allowedRoles: string[]): CanActivateFn => () => {
    const authService = inject(AuthService);
    const router = inject(Router);

    const role = authService.currentUser?.role;

    if (role && allowedRoles.includes(role)) {
        return true;
    }

    return router.createUrlTree(['/']);
};
