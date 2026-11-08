import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, effect, inject, input, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { Company } from '@features/companies/models/company.model';
import { TextBoxModule } from '@syncfusion/ej2-angular-inputs';

// D103 · Cambiar el cupo de usuarios de una empresa. El botón de guardar vive en el diálogo; esta pieza expone `canSubmit` y `onSubmit()` como el resto de los formularios de
// Monkey Admin. La vista hace la llamada y, si el servidor rechaza el cupo (409 MAX_USERS_BELOW_CURRENT), pasa el motivo en `error` para mostrarlo aquí dentro.
@Component({
  selector: 'app-company-quota-form',
  imports: [ReactiveFormsModule, TranslateModule, TextBoxModule],
  templateUrl: './company-quota-form.html',
  changeDetection: ChangeDetectionStrategy.Default,
})
export class CompanyQuotaForm implements OnInit {
  // `null` mientras el diálogo está cerrado: la pieza queda montada y se vuelve a llenar con cada empresa.
  company = input<Company | null>(null);
  // Lo que dijo el servidor si rechazó el cupo; se muestra dentro del diálogo, que sigue abierto.
  error = input<string | null>(null);
  approved = output<number>();

  private readonly fb = inject(FormBuilder);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly form = this.fb.group({
    max_users: [null as number | null, [Validators.required, Validators.min(1), Validators.pattern(/^\d+$/)]],
  });

  constructor() {
    effect(() => {
      const company = this.company();
      // Parte del cupo actual; una empresa anterior al cupo (sin tope) empieza vacía.
      this.form.reset({ max_users: company?.max_users ?? null });
    });
  }

  ngOnInit(): void {
    this.form.valueChanges.subscribe(() => this.cdr.markForCheck());
  }

  // Lo menos que se puede fijar: ni menos de 1 ni menos que las cuentas que ya cuentan (el servidor lo vuelve a comprobar).
  get minAllowed(): number {
    return Math.max(1, this.company()?.users_count ?? 0);
  }

  get value(): number | null {
    const raw = this.form.controls.max_users.value;
    return raw === null || raw === ('' as unknown) ? null : Number(raw);
  }

  get belowCurrent(): boolean {
    const value = this.value;
    return value !== null && Number.isInteger(value) && value < this.minAllowed;
  }

  get canSubmit(): boolean {
    return this.form.valid && this.value !== null && !this.belowCurrent && this.value !== this.company()?.max_users;
  }

  onSubmit(): void {
    if (!this.canSubmit) {
      this.form.markAllAsTouched();
      return;
    }
    this.approved.emit(this.value!);
  }
}
