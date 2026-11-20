import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, output, inject } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { FrameworkOption, RegisteredCompany } from '@shared/models/company.model';
import { CompanyService } from '@features/companies/services/company.service';
import { ToastService } from '@shared/presentation/components/toast-container/toast.service';
import { unwrapData } from '@shared/domain/utils/unwrap-response';
import { finalize } from 'rxjs';
import { hasChanges } from '@shared/domain/utils/form-changes';

@Component({
  selector: 'app-company-form',
  imports: [CommonModule, ReactiveFormsModule, TranslateModule],
  templateUrl: './company-form.html',
  changeDetection: ChangeDetectionStrategy.Default,
})
export class CompanyForm implements OnInit {
  companyService = inject(CompanyService);
  private toast = inject(ToastService);
  private translate = inject(TranslateService);
  private cdr = inject(ChangeDetectorRef);

  // Emite la empresa recién registrada, con su clave en claro, para mostrarla una sola vez.
  registered = output<RegisteredCompany>();
  sendingForm = false;

  // Todos los marcos que Monkey ofrece y los elegidos. Solo los `available` se pueden contratar (hoy,
  // SOC 2); los demás se muestran como «próximamente» (D50). Si hay un único marco disponible, ya viene elegido.
  frameworks: FrameworkOption[] = [];
  selectedFrameworks: string[] = [];
  frameworksFailed = false;
  // Los marcos que vienen elegidos de partida (el único disponible): elegir otros cuenta como un cambio.
  private defaultFrameworks: string[] = [];

  ngOnInit(): void {
    this.companyService.initializeForm();
    this.loadFrameworks();
  }

  loadFrameworks(): void {
    this.frameworksFailed = false;
    this.companyService.readFrameworks().subscribe({
      next: (resp) => {
        this.frameworks = resp.data?.items ?? [];
        const available = this.frameworks.filter((f) => f.availability === 'available');
        this.defaultFrameworks = available.length === 1 ? [available[0].code] : [];
        this.selectedFrameworks = [...this.defaultFrameworks];
        this.cdr.markForCheck();
      },
      error: () => {
        this.frameworksFailed = true;
        this.cdr.markForCheck();
      },
    });
  }

  isAvailable(framework: FrameworkOption): boolean {
    return framework.availability === 'available';
  }

  /** MD-485 · La base de datos dedicada aún no existe: la casilla no se muestra (Rod). Se vuelve a `true` cuando exista. */
  readonly dedicatedAvailable = false;

  get requiresDedicated(): boolean {
    return !!this.companyService.form.get('requires_dedicated_database')?.value;
  }

  isSelected(code: string): boolean {
    return this.selectedFrameworks.includes(code);
  }

  toggleFramework(framework: FrameworkOption): void {
    if (!this.isAvailable(framework)) return;
    const code = framework.code;
    this.selectedFrameworks = this.isSelected(code)
      ? this.selectedFrameworks.filter((c) => c !== code)
      : [...this.selectedFrameworks, code];
  }

  hasError(name: string, key: string): boolean {
    const control = this.companyService.form.get(name);
    return !!control && control.touched && control.hasError(key);
  }

  // MD-485 · Con algo escrito o elegido distinto de lo de partida, cerrar el modal pide confirmar antes de descartarlo (`guarded`).
  get dirty(): boolean {
    return hasChanges(this.companyService.initialValue, this.companyService.form.getRawValue()) || hasChanges([...this.defaultFrameworks].sort(), [...this.selectedFrameworks].sort());
  }

  // Al volver a abrir el registro, los marcos vuelven a los de partida (lo descartado no reaparece).
  restartFrameworks(): void {
    this.selectedFrameworks = [...this.defaultFrameworks];
  }

  onSubmit(): void {
    if (this.sendingForm) return;
    const form = this.companyService.form;
    if (form.invalid || this.selectedFrameworks.length === 0) {
      form.markAllAsTouched();
      this.toast.showWarning(
        this.translate.instant('COMPANIES_MODULE.FORM.INCOMPLETE_TITLE'),
        this.translate.instant('COMPANIES_MODULE.FORM.INCOMPLETE_MESSAGE'),
      );
      return;
    }

    this.sendingForm = true;
    const { name, admin_email, requires_dedicated_database, max_users } = form.getRawValue();
    this.companyService
      .createCompany({
        name: name.trim(),
        admin_email: admin_email.trim().toLowerCase(),
        requires_dedicated_database: !!requires_dedicated_database,
        framework_codes: this.selectedFrameworks,
        max_users: Number(max_users),
      })
      .pipe(unwrapData(), finalize(() => (this.sendingForm = false)))
      .subscribe({
        next: (company) => {
          this.companyService.initializeForm();
          this.loadFrameworks();
          this.registered.emit(company);
        },
        error: (err: Error & { fields?: { field: string; message: string }[] }) => {
          // D103 · Un 422 sobre el cupo se muestra junto al campo, no solo en un aviso.
          const maxUsers = err.fields?.find((f) => f.field === 'max_users');
          if (maxUsers) {
            const control = form.get('max_users');
            control?.setErrors({ server: maxUsers.message });
            control?.markAsTouched();
            this.cdr.markForCheck();
            return;
          }
          this.toast.showError(this.translate.instant('COMPANIES_MODULE.FORM.ERROR_TITLE'), err.message, 6000);
        },
      });
  }
}
