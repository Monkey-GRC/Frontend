import { LocalDatePipe } from '@shared/presentation/pipes/local-date.pipe';
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
} from '@shared/models/company.model';
import { Select, SelectOption } from '@shared/presentation/components/select/select';
import { hasChanges } from '@shared/domain/utils/form-changes';

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
  imports: [CommonModule, ReactiveFormsModule, TranslateModule, Select, LocalDatePipe],
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

  // El valor de partida (tras cada `reset`): lo distinto de esto es lo que se perdería al cerrar.
  private initial: unknown = null;
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
      this.initial = this.form.getRawValue();
    });
  }

  ngOnInit(): void {
    this.form.valueChanges.subscribe(() => this.cdr.markForCheck());
  }

  readonly reasonOptions: SelectOption[] = DEACTIVATION_REASONS.map((code) => ({ value: code, labelKey: 'COMPANIES_MODULE.ARCHIVE.REASON.' + code }));

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

  // Con datos escritos sin enviar: el modal que lo contiene no se cierra solo con Esc ni con un clic fuera.
  // MD-485 · Lo escrito ya no es lo de partida: cerrar el modal pide confirmar antes de descartarlo (`guarded`).
  get dirty(): boolean {
    return hasChanges(this.initial, this.form.getRawValue());
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
