import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, output } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { FrameworkOption, RegisteredCompany } from '@features/companies/models/company.model';
import { CompanyService } from '@features/companies/services/company.service';
import { ToastService } from '@shared/services/toast.service';
import { TextBoxModule } from '@syncfusion/ej2-angular-inputs';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-company-form',
  imports: [CommonModule, ReactiveFormsModule, TextBoxModule, TranslateModule],
  templateUrl: './company-form.html',
  changeDetection: ChangeDetectionStrategy.Default,
})
export class CompanyForm implements OnInit {
  // Emite la empresa recién registrada, con su clave en claro, para mostrarla una sola vez.
  registered = output<RegisteredCompany>();
  sendingForm = false;

  // Marcos que se pueden contratar y los elegidos. Con un solo marco (hoy, SOC 2) no hay nada que
  // decidir: se muestra fijo y ya viene elegido (D47).
  frameworks: FrameworkOption[] = [];
  selectedFrameworks: string[] = [];
  frameworksFailed = false;

  constructor(
    public companyService: CompanyService,
    private toast: ToastService,
    private translate: TranslateService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.companyService.initializeForm();
    this.loadFrameworks();
  }

  loadFrameworks(): void {
    this.frameworksFailed = false;
    this.companyService.readFrameworks().subscribe({
      next: (resp) => {
        this.frameworks = resp.data?.items ?? [];
        // Un solo marco: queda elegido y bloqueado. Si algún día hay más, el usuario decide.
        this.selectedFrameworks = this.frameworks.length === 1 ? [this.frameworks[0].code] : [];
        this.cdr.markForCheck();
      },
      error: () => {
        this.frameworksFailed = true;
        this.cdr.markForCheck();
      },
    });
  }

  get frameworkLocked(): boolean {
    return this.frameworks.length === 1;
  }

  get requiresDedicated(): boolean {
    return !!this.companyService.form.get('requires_dedicated_database')?.value;
  }

  isSelected(code: string): boolean {
    return this.selectedFrameworks.includes(code);
  }

  toggleFramework(code: string): void {
    if (this.frameworkLocked) return;
    this.selectedFrameworks = this.isSelected(code)
      ? this.selectedFrameworks.filter((c) => c !== code)
      : [...this.selectedFrameworks, code];
  }

  hasError(name: string, key: string): boolean {
    const control = this.companyService.form.get(name);
    return !!control && control.touched && control.hasError(key);
  }

  onSubmit(): void {
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
    const { name, admin_email, requires_dedicated_database } = form.getRawValue();
    this.companyService
      .createCompany({
        name: name.trim(),
        admin_email: admin_email.trim().toLowerCase(),
        requires_dedicated_database: !!requires_dedicated_database,
        framework_codes: this.selectedFrameworks,
      })
      .pipe(finalize(() => (this.sendingForm = false)))
      .subscribe({
        next: (resp) => {
          this.companyService.initializeForm();
          this.loadFrameworks();
          this.registered.emit(resp.data!);
        },
        error: (err: Error) => {
          this.toast.showError(this.translate.instant('COMPANIES_MODULE.FORM.ERROR_TITLE'), err.message, 6000);
        },
      });
  }
}
