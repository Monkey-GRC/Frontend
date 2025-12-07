import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { AuthService } from '@features/auth/services/auth.service';
import { Subscription, finalize } from 'rxjs';

@Component({
  selector: 'app-login-form',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
  ],
  templateUrl: './login-form.html',
  styleUrl: './login-form.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginForm {

  private subs = new Subscription();
  private returnUrl: string | null = null;

  // UI state (signals o simples props)
  loading = signal(false);
  errorMsg = signal<string | null>(null);
  form!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router,
    private route: ActivatedRoute,
  ) { }

  ngOnInit(): void {
    // lee returnUrl una sola vez
    this.returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    this.form = this.fb.group({
      identifier: ['', [Validators.required]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      remember: [false],
    });
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  submit(): void {
    this.errorMsg.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const dto = {
      identifier: this.form.value.identifier!.trim(),
      password: this.form.value.password!,
    };

    this.loading.set(true);

    const sub = this.auth.login(dto)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (resp: any) => {
          if (resp) {
            this.auth.setToken(resp.data.access_token, resp.data.refresh_token);
            this.navigateAfterLogin();
          } else {
            this.errorMsg.set('No se pudo iniciar sesión. Verifica tus credenciales.');
          }
        },
        error: (err) => {
          const msg = err?.error?.message || err?.message || 'No se pudo iniciar sesión. Verifica tus credenciales.';
          this.errorMsg.set(msg);
        }
      });

    this.subs.add(sub);
  }


  private navigateAfterLogin(): void {
    // si returnUrl es vacío, raíz, o apunta a /auth, ignóralo
    const ru = this.returnUrl;
    const invalid =
      !ru || ru === '/' || ru === '' || ru.startsWith('/auth');

    const target = invalid ? '/' : ru!;
    this.router.navigateByUrl(target);
  }

  // helpers para template
  get f() { return this.form.controls; }
  hasError(name: keyof typeof this.form.controls, key: string): boolean {
    const c = this.form.get(name as string);
    return !!c && c.touched && c.hasError(key);
  }

}
