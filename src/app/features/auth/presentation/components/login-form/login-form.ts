import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, signal, OnInit, OnDestroy, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { AuthService } from '@core/services/auth.service';
import { PasswordToggle } from '@shared/presentation/components/password-toggle/password-toggle';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { Busy } from '@shared/presentation/directives/busy';
import { BusyFields } from '@shared/presentation/directives/busy-fields';

@Component({
  selector: 'app-login-form',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    PasswordToggle,
    TranslatePipe,
    Busy,
    BusyFields,
  ],
  templateUrl: './login-form.html',
  styleUrl: './login-form.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginForm implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private translate = inject(TranslateService);


  private subs = new Subscription();
  private returnUrl: string | null = null;

  // UI state (signals o simples props)
  loading = signal(false);
  showPassword = signal(false);
  errorMsg = signal<string | null>(null);
  form!: FormGroup;

  ngOnInit(): void {
    // lee returnUrl una sola vez
    this.returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]],
      remember: [false],
    });
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  submit(): void {
    if (this.loading()) return;
    this.errorMsg.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { email, password } = this.form.value;
    if (typeof email !== 'string' || typeof password !== 'string') return;
    const dto = {
      email: email.trim().toLowerCase(),
      password,
    };

    this.loading.set(true);

    // Busy stays on until the answer arrives and, when it succeeds, until the navigation ends; it only goes off on error.
    const sub = this.auth.login(dto)
      .subscribe({
        next: (outcome) => {
          if (outcome.kind === 'mfa') {
            // Falta el segundo factor (D94): la pantalla del código conserva a dónde volver.
            void this.router.navigate(['/auth/mfa'], { queryParams: this.returnUrl ? { returnUrl: this.returnUrl } : {}, replaceUrl: true }).finally(() => this.loading.set(false));
            return;
          }
          // ✅ Si llegó aquí, las cookies ya están seteadas por el backend
          this.navigateAfterLogin();
        },
        error: (err) => {
          const msg =
            err?.error?.message ||
            err?.message ||
            this.translate.instant('AUTH.LOGIN.ERROR_FALLBACK');
          this.errorMsg.set(msg);
          this.loading.set(false);
        },
      });

    this.subs.add(sub);
  }



  private navigateAfterLogin(): void {
    // si returnUrl es vacío, raíz, o apunta a /auth, ignóralo
    const ru = this.returnUrl;
    const target = ru && ru !== '/' && !ru.startsWith('/auth') ? ru : '/';
    // `replaceUrl`: el login no queda en el historial, así «atrás» no vuelve a él.
    void this.router.navigateByUrl(target, { replaceUrl: true }).finally(() => this.loading.set(false));
  }

  // helpers para template
  get f() { return this.form.controls; }
  hasError(name: keyof typeof this.form.controls, key: string): boolean {
    const c = this.form.get(name as string);
    return !!c && c.touched && c.hasError(key);
  }

}
