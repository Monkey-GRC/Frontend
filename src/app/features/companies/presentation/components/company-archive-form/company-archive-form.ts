import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, effect, inject, input, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import {
  Company,
  DEACTIVATION_REASONS,
  DEFAULT_RETENTION_DAYS,
  DeactivationReason,
  MIN_RETENTION_DAYS,
} from '@features/companies/models/company.model';
import { TextBoxModule } from '@syncfusion/ej2-angular-inputs';

export interface ArchiveDetails {
  confirm_name: string;
  reason_code: DeactivationReason;
  reason: string;
  retention_days: number;
}

const DAY_MS = 86_400_000;

// D97 · Archivar una empresa: los datos del archivado. Aprobarlo NO lo envía: la vista pide después el código de seguridad de quien archiva. El botón de aprobar vive en el
// diálogo; esta pieza expone `canSubmit` y `onSubmit()` como el resto de los formularios de Monkey Admin.
@Component({
  selector: 'app-company-archive-form',
  imports: [CommonModule, ReactiveFormsModule, TranslateModule, TextBoxModule],
  templateUrl: './company-archive-form.html',
  changeDetection: ChangeDetectionStrategy.Default,
})
export class CompanyArchiveForm implements OnInit {
  // `null` mientras el diálogo está cerrado: la pieza queda montada (el diálogo mide su contenido al abrir) y se vacía con cada empresa.
  company = input<Company | null>(null);
  approved = output<ArchiveDetails>();

  readonly minDays = MIN_RETENTION_DAYS;

  private readonly fb = inject(FormBuilder);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly form = this.fb.nonNullable.group({
    confirm_name: ['', [Validators.required]],
    reason_code: ['non_payment' as DeactivationReason, [Validators.required]],
    reason: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(500)]],
    retention_days: [DEFAULT_RETENTION_DAYS, [Validators.required, Validators.min(MIN_RETENTION_DAYS), Validators.max(3650)]],
  });

  constructor() {
    effect(() => {
      this.company();
      this.form.reset({ confirm_name: '', reason_code: 'non_payment', reason: '', retention_days: DEFAULT_RETENTION_DAYS });
    });
  }

  ngOnInit(): void {
    this.form.valueChanges.subscribe(() => this.cdr.markForCheck());
  }

  readonly reasons = DEACTIVATION_REASONS;

  // Tiene que coincidir letra por letra: es la barrera contra archivar la empresa equivocada.
  get nameMatches(): boolean {
    const company = this.company();
    return !!company && this.form.controls.confirm_name.value === company.name;
  }

  get canSubmit(): boolean {
    return this.nameMatches && this.form.valid;
  }

  get deleteDate(): Date {
    return new Date(Date.now() + (Number(this.form.controls.retention_days.value) || 0) * DAY_MS);
  }

  hasError(name: keyof typeof this.form.controls, key: string): boolean {
    const control = this.form.controls[name];
    return control.touched && control.hasError(key);
  }

  onSubmit(): void {
    if (!this.canSubmit) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    this.approved.emit({
      confirm_name: value.confirm_name,
      reason_code: value.reason_code,
      reason: value.reason.trim(),
      retention_days: Number(value.retention_days),
    });
  }
}
