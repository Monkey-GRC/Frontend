import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { AuthPageLayoutComponent } from '@core/presentation/pages/auth-page-layout/auth-page-layout.component';
import { AuthService } from '@core/services/auth.service';
import { apiErrorCode, apiErrorMessage } from '@shared/domain/utils/api-error';
import { passwordsMatch, STRONG_PASSWORD } from '@shared/domain/utils/password-rules';
import { Field } from '@shared/presentation/components/field/field';
import { NewPasswordFields } from '@shared/presentation/components/new-password-fields/new-password-fields';
import { Busy } from '@shared/presentation/directives/busy';
import { BusyFields } from '@shared/presentation/directives/busy-fields';

const KNOWN_CODES = ['ACTIVATION_CODE_INVALID', 'ACTIVATION_CODE_ALREADY_USED', 'ACTIVATION_CODE_EXPIRED', 'ACTIVATION_CODE_EMAIL_MISMATCH', 'ACTIVATION_CODE_RATE_LIMITED'];

// Activar la cuenta de una invitación (D95, D117): 1) el código del correo (también puede venir en el enlace, `?code=`), 2) la contraseña con la política de SEG-13. Al terminar la cuenta
// no tiene sesión y el servidor deja abierto el desafío de configurar el segundo factor: se sigue en `/auth/mfa`, la misma pantalla del primer ingreso.
@Component({
  selector: 'app-activate',
  imports: [ReactiveFormsModule, RouterLink, TranslatePipe, AuthPageLayoutComponent, NewPasswordFields, Field, Busy, BusyFields],
  templateUrl: './activate.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Activate {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly translate = inject(TranslateService);

  readonly stage = signal<'code' | 'password'>('code');
  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  // El código ya no sirve y no hay nada que reintentar con él (usado, vencido, demasiados intentos).
  readonly dead = signal(false);
  readonly deadKey = signal('AUTH.ACTIVATE.DEAD.EXPIRED');
  readonly email = signal('');

  readonly codeControl = new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(8)] });
  readonly form = this.fb.nonNullable.group(
    {
      password: ['', [Validators.required, Validators.pattern(STRONG_PASSWORD)]],
      password_confirmation: ['', Validators.required],
    },
    { validators: passwordsMatch() },
  );

  constructor() {
    const fromLink = inject(ActivatedRoute).snapshot.queryParamMap.get('code')?.trim();
    if (fromLink) {
      this.codeControl.setValue(fromLink);
      this.lookup();
    }
  }

  private get code(): string {
    return this.codeControl.value.trim().toUpperCase();
  }

  lookup(): void {
    if (this.loading()) return;
    if (this.codeControl.invalid) {
      this.codeControl.markAsTouched();
      return;
    }
    this.loading.set(true);
    this.errorMessage.set(null);
    this.auth.lookupActivation(this.code).subscribe({
      next: (found) => {
        this.loading.set(false);
        this.email.set(found.email);
        this.stage.set('password');
      },
      error: (error) => this.fail(error),
    });
  }

  submit(): void {
    if (this.loading()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.errorMessage.set(null);
    this.auth.activateAccount({ code: this.code, email: this.email(), password: this.form.getRawValue().password }).subscribe({
      next: () => {
        this.router.navigateByUrl('/auth/mfa', { replaceUrl: true }).then(() => this.loading.set(false), () => this.loading.set(false));
      },
      error: (error) => this.fail(error),
    });
  }

  private fail(error: unknown): void {
    this.loading.set(false);
    const code = apiErrorCode(error) ?? (error as { code?: string })?.code ?? null;
    const known = code && KNOWN_CODES.includes(code) ? `AUTH.ACTIVATE.ERRORS.${code}` : null;
    const deadCause = code === 'ACTIVATION_CODE_ALREADY_USED' ? 'ALREADY_USED' : code === 'ACTIVATION_CODE_EXPIRED' ? 'EXPIRED' : code === 'ACTIVATION_CODE_RATE_LIMITED' || (error as { status?: number })?.status === 429 ? 'RATE_LIMITED' : null;
    if (deadCause) {
      this.deadKey.set(`AUTH.ACTIVATE.DEAD.${deadCause}`);
      this.dead.set(true);
    }
    this.errorMessage.set(known ? this.translate.instant(known) : apiErrorMessage(error, this.translate.instant('AUTH.ACTIVATE.ERROR_FALLBACK')));
  }
}
