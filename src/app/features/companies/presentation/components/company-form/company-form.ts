import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, output } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { RegisteredCompany } from '@features/companies/models/company.model';
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

  constructor(
    public companyService: CompanyService,
    private toast: ToastService,
    private translate: TranslateService,
  ) {}

  ngOnInit(): void {
    this.companyService.initializeForm();
  }

  get requiresDedicated(): boolean {
    return !!this.companyService.form.get('requires_dedicated_database')?.value;
  }

  hasError(name: string, key: string): boolean {
    const control = this.companyService.form.get(name);
    return !!control && control.touched && control.hasError(key);
  }

  onSubmit(): void {
    const form = this.companyService.form;
    if (form.invalid) {
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
      })
      .pipe(finalize(() => (this.sendingForm = false)))
      .subscribe({
        next: (resp) => {
          this.companyService.initializeForm();
          this.registered.emit(resp.data!);
        },
        error: (err: Error) => {
          this.toast.showError(this.translate.instant('COMPANIES_MODULE.FORM.ERROR_TITLE'), err.message, 6000);
        },
      });
  }
}
