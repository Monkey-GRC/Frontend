import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, ViewChild } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Company, RegisteredCompany } from '@features/companies/models/company.model';
import { CompanyService } from '@features/companies/services/company.service';
import { AccessKeySent } from '@features/companies/presentation/components/access-key-sent/access-key-sent';
import { ArchiveDetails, CompanyArchiveForm } from '@features/companies/presentation/components/company-archive-form/company-archive-form';
import { CompanyForm } from '@features/companies/presentation/components/company-form/company-form';
import { CompanyReactivateForm, ReactivateDetails } from '@features/companies/presentation/components/company-reactivate-form/company-reactivate-form';
import { CompanyList } from '@features/companies/presentation/components/company-list/company-list';
import { SecondFactorAnswer, SecondFactorDialog } from '@shared/presentation/components/second-factor-dialog/second-factor-dialog';
import { DialogComponent } from '@shared/presentation/components/dialog/dialog';
import { LoaderComponent } from '@shared/presentation/components/loader/loader.component';
import { finalize } from 'rxjs';
import { ToastService } from '@shared/services/toast.service';

@Component({
  selector: 'app-companies',
  imports: [
    CommonModule,
    TranslateModule,
    CompanyList,
    CompanyForm,
    CompanyArchiveForm,
    CompanyReactivateForm,
    SecondFactorDialog,
    AccessKeySent,
    DialogComponent,
    LoaderComponent,
  ],
  templateUrl: './companies.html',
  changeDetection: ChangeDetectionStrategy.Default,
})
export class Companies implements OnInit {
  isLoading = false;
  isFormVisible = false;
  // La empresa recién registrada, mientras se dice si su clave salió por correo (D99). La clave no se muestra
  // nunca; si no salió, se reenvía una nueva.
  registered: RegisteredCompany | null = null;
  resendingKey = false;

  // D97: la empresa que se está archivando o reactivando (el diálogo abierto).
  archiving: Company | null = null;
  reactivating: Company | null = null;

  @ViewChild(CompanyForm) companyForm?: CompanyForm;
  // D97: tras aprobar el formulario se pide el código de seguridad; aquí queda lo aprobado mientras se escribe.
  stepUp: { kind: 'archive' | 'reactivate'; company: Company; archive?: ArchiveDetails; reactivate?: ReactivateDetails } | null = null;
  stepUpSending = false;
  // Lo que dijo el servidor si rechazó el código (se muestra dentro del modal, que sigue abierto).
  stepUpError: string | null = null;

  @ViewChild(CompanyArchiveForm) archiveForm?: CompanyArchiveForm;
  @ViewChild(CompanyReactivateForm) reactivateForm?: CompanyReactivateForm;

  constructor(
    public companyService: CompanyService,
    private toast: ToastService,
    private translate: TranslateService,
  ) {}

  ngOnInit(): void {
    this.readCompanies(1);
  }

  onOpenForm() {
    this.companyService.initializeForm();
    this.isFormVisible = true;
  }

  onCloseForm() {
    this.isFormVisible = false;
  }

  onRegistered(company: RegisteredCompany) {
    this.isFormVisible = false;
    this.registered = company;
    this.readCompanies(1);
  }

  onCloseKey() {
    this.registered = null;
  }

  // D99 · Desde el resumen del registro: emite una clave nueva y la manda; el resumen refleja si salió.
  onResendFromSummary() {
    const company = this.registered;
    if (!company || this.resendingKey) return;
    this.resendingKey = true;
    this.companyService.regenerateAccessKey(company.id).pipe(finalize(() => (this.resendingKey = false))).subscribe({
      next: (resp) => {
        this.registered = { ...company, access_key: resp.data! };
        this.readCompanies(1);
      },
      error: (err: Error) => this.toast.showError(this.translate.instant('COMPANIES_MODULE.KEY.RESEND_ERROR_TITLE'), err.message, 6000),
    });
  }

  // D99 · Desde la lista: reenviar la clave de una empresa que aún no la canjeó.
  onResendKey(company: Company) {
    if (this.resendingKey) return;
    this.resendingKey = true;
    this.companyService.regenerateAccessKey(company.id).pipe(finalize(() => (this.resendingKey = false))).subscribe({
      next: (resp) => {
        const ok = resp.data!.delivery_status === 'sent';
        const show = ok ? this.toast.showSuccess.bind(this.toast) : this.toast.showError.bind(this.toast);
        show(
          this.translate.instant(ok ? 'COMPANIES_MODULE.KEY.RESEND_SUCCESS_TITLE' : 'COMPANIES_MODULE.KEY.RESEND_FAILED_TITLE'),
          this.translate.instant(ok ? 'COMPANIES_MODULE.KEY.RESEND_SUCCESS_MESSAGE' : 'COMPANIES_MODULE.KEY.RESEND_FAILED_MESSAGE', { email: company.admin_email }),
        );
        this.readCompanies(1);
      },
      error: (err: Error) => this.toast.showError(this.translate.instant('COMPANIES_MODULE.KEY.RESEND_ERROR_TITLE'), err.message, 6000),
    });
  }

  onFilterChange(archived: boolean) {
    this.companyService.statusFilter = archived ? 'deactivated' : null;
    this.companyService.companies = [];
    this.readCompanies(1);
  }

  onArchiveApproved(details: ArchiveDetails) {
    this.stepUp = { kind: 'archive', company: this.archiving!, archive: details };
    this.archiving = null;
    this.stepUpError = null;
  }

  onReactivateApproved(details: ReactivateDetails) {
    this.stepUp = { kind: 'reactivate', company: this.reactivating!, reactivate: details };
    this.reactivating = null;
    this.stepUpError = null;
  }

  // Con el código escrito se envía lo aprobado. Si falla (código equivocado, por ejemplo) el diálogo sigue abierto para volver a escribirlo.
  onStepUpConfirmed(answer: SecondFactorAnswer) {
    const pending = this.stepUp;
    const code = answer.code;
    if (!pending || !code || this.stepUpSending) return;
    const key = pending.kind === 'archive' ? 'ARCHIVE' : 'REACTIVATE';
    const request =
      pending.kind === 'archive'
        ? this.companyService.archiveCompany(pending.company.id, { ...pending.archive!, totp_code: code })
        : this.companyService.reactivateCompany(pending.company.id, { ...pending.reactivate!, totp_code: code });
    this.stepUpSending = true;
    this.stepUpError = null;
    request.pipe(finalize(() => (this.stepUpSending = false))).subscribe({
      next: (resp) => {
        this.toast.showSuccess(
          this.translate.instant(`COMPANIES_MODULE.${key}.SUCCESS_TITLE`),
          this.translate.instant(`COMPANIES_MODULE.${key}.SUCCESS_MESSAGE`, {
            name: resp.data!.name,
            date: resp.data!.archive_until ? new Date(resp.data!.archive_until).toLocaleDateString() : '',
          }),
        );
        this.closeStepUp();
        this.readCompanies(1);
      },
      // El modal sigue abierto con el motivo (un código equivocado, por ejemplo) y el campo vacío para escribir otro.
      error: (err: Error) => (this.stepUpError = err.message || this.translate.instant(`COMPANIES_MODULE.${key}.ERROR_TITLE`)),
    });
  }

  // Al cerrar (con éxito o cancelando) se olvida lo aprobado; el modal siempre se abre vacío porque un código es de un solo uso.
  closeStepUp() {
    this.stepUp = null;
    this.stepUpError = null;
  }

  readCompanies(page: number) {
    this.isLoading = this.companyService.companies.length === 0;
    this.companyService.readCompanies(page).subscribe({
      next: (resp) => {
        const data = resp.data!;
        this.companyService.companies = data.items;
        this.companyService.page = data.page;
        this.companyService.total = data.total;
        this.companyService.totalPages = data.total_pages;
        this.isLoading = false;
      },
      error: (err: Error) => {
        this.toast.showError(this.translate.instant('COMPANIES_MODULE.LIST.LOAD_ERROR'), err.message);
        this.isLoading = false;
      },
    });
  }
}
