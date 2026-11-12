import { LocalDatePipe } from '@shared/presentation/pipes/local-date.pipe';
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, effect, inject, input, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { Company } from '@shared/models/company.model';

export interface ReactivateDetails {
  reason: string;
}

// D97 · Reactivar una empresa archivada, solo dentro del plazo. Igual que archivar: aprobarlo no lo envía, la vista pide después el código de seguridad.
@Component({
  selector: 'app-company-reactivate-form',
  imports: [CommonModule, ReactiveFormsModule, TranslateModule, LocalDatePipe],
  templateUrl: './company-reactivate-form.html',
  changeDetection: ChangeDetectionStrategy.Default,
})
export class CompanyReactivateForm implements OnInit {
  company = input<Company | null>(null);
  approved = output<ReactivateDetails>();

  private readonly fb = inject(FormBuilder);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly form = this.fb.nonNullable.group({
    reason: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(500)]],
  });

  constructor() {
    effect(() => {
      this.company();
      this.form.reset({ reason: '' });
    });
  }

  ngOnInit(): void {
    this.form.valueChanges.subscribe(() => this.cdr.markForCheck());
  }

  get canSubmit(): boolean {
    return this.form.valid;
  }

  // Con datos escritos sin enviar: el modal que lo contiene no se cierra solo con Esc ni con un clic fuera.
  get dirty(): boolean {
    return this.form.dirty;
  }

  onSubmit(): void {
    if (!this.canSubmit) {
      this.form.markAllAsTouched();
      return;
    }
    this.approved.emit({ reason: this.form.getRawValue().reason.trim() });
  }
}
