import { LanguageService } from '@core/services/language.service';
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, ViewChild, inject } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Company, MAX_USERS_BELOW_CURRENT, MaxUsersBelowCurrent, RegisteredCompany } from '@shared/models/company.model';
import { CompanyQuotaForm } from '@features/companies/presentation/components/company-quota-form/company-quota-form';
import { CompanyService } from '@features/companies/services/company.service';
import { AccessKeySent } from '@features/companies/presentation/components/access-key-sent/access-key-sent';
import { ArchiveDetails, CompanyArchiveForm } from '@features/companies/presentation/components/company-archive-form/company-archive-form';
import { CompanyForm } from '@features/companies/presentation/components/company-form/company-form';
import { CompanyReactivateForm, ReactivateDetails } from '@features/companies/presentation/components/company-reactivate-form/company-reactivate-form';
import { CompanyList } from '@features/companies/presentation/components/company-list/company-list';
import { SecondFactorAnswer, SecondFactorDialog } from '@shared/presentation/components/second-factor-dialog/second-factor-dialog';
import { formatLocalDate } from '@shared/domain/utils/date-format';
import { unwrapData } from '@shared/domain/utils/unwrap-response';
import { FormModal } from '@shared/presentation/components/form-modal/form-modal';
import { Busy } from '@shared/presentation/directives/busy';
import { finalize } from 'rxjs';
import { ToastService } from '@shared/presentation/components/toast-container/toast.service';

@Component({
  selector: 'app-companies',
  imports: [
    CommonModule,
    TranslateModule,
    CompanyList,
    CompanyForm,
    CompanyArchiveForm,
    CompanyReactivateForm,
    CompanyQuotaForm,
    SecondFactorDialog,
    AccessKeySent,
    FormModal,
    Busy,
  ],
  templateUrl: './companies.html',
  changeDetection: ChangeDetectionStrategy.Default,
})
export class Companies implements OnInit {
  companyService = inject(CompanyService);
  private toast = inject(ToastService);
  private translate = inject(TranslateService);
  private language = inject(LanguageService);

  isLoading = false;
  isFormVisible = false;
  // La empresa recién registrada, mientras se dice si su clave salió por correo (D99). La clave no se muestra
  // nunca; si no salió, se reenvía una nueva.
  registered: RegisteredCompany | null = null;
  resendingKey = false;
  resendingId: string | null = null;

  // D97: la empresa que se está archivando o reactivando (el diálogo abierto).
  archiving: Company | null = null;
  reactivating: Company | null = null;

  // D103: la empresa cuyo cupo de usuarios se está cambiando (el diálogo abierto) y lo que dijo el servidor si lo rechazó.
  changingQuota: Company | null = null;
  quotaSending = false;
  quotaError: string | null = null;

  @ViewChild(CompanyQuotaForm) quotaForm?: CompanyQuotaForm;
  @ViewChild(CompanyForm) companyForm?: CompanyForm;
  // D97: tras aprobar el formulario se pide el código de seguridad; aquí queda lo aprobado mientras se escribe.
  stepUp:
    | { kind: 'archive'; company: Company; archive: ArchiveDetails }
    | { kind: 'reactivate'; company: Company; reactivate: ReactivateDetails }
    | null = null;
  stepUpSending = false;
  // Lo que dijo el servidor si rechazó el código (se muestra dentro del modal, que sigue abierto).
  stepUpError: string | null = null;

  @ViewChild(CompanyArchiveForm) archiveForm?: CompanyArchiveForm;
  @ViewChild(CompanyReactivateForm) reactivateForm?: CompanyReactivateForm;

  ngOnInit(): void {
    this.readCompanies(1);
  }

  onOpenForm() {
    this.companyService.initializeForm();
    this.companyForm?.restartFrameworks();
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

  // D99 · El correo con la clave no salió: el aviso lo dice en su título y ofrece reenviarla.
  get keyFailed(): boolean {
    return this.registered?.access_key.delivery_status === 'failed';
  }

  onCloseKey() {
    if (this.resendingKey) return;
    this.registered = null;
  }

  // D99 · Desde el resumen del registro: emite una clave nueva y la manda; el resumen refleja si salió.
  onResendFromSummary() {
    const company = this.registered;
    if (!company || this.resendingKey) return;
    this.resendingKey = true;
    this.companyService.regenerateAccessKey(company.id).pipe(unwrapData(), finalize(() => (this.resendingKey = false))).subscribe({
      next: (accessKey) => {
        this.registered = { ...company, access_key: accessKey };
        this.readCompanies(1);
      },
      error: (err: Error) => this.toast.showError(this.translate.instant('COMPANIES_MODULE.KEY.RESEND_ERROR_TITLE'), err.message, 6000),
    });
  }

  // D99 · Desde la lista: reenviar la clave de una empresa que aún no la canjeó.
  onResendKey(company: Company) {
    if (this.resendingKey) return;
    this.resendingKey = true;
    this.resendingId = company.id;
    this.companyService.regenerateAccessKey(company.id).pipe(unwrapData(), finalize(() => { this.resendingKey = false; this.resendingId = null; })).subscribe({
      next: (key) => {
        const ok = key.delivery_status === 'sent';
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

  onOpenQuota(company: Company) {
    this.quotaError = null;
    this.changingQuota = company;
  }

  onCloseQuota() {
    if (this.quotaSending) return;
    this.changingQuota = null;
    this.quotaError = null;
  }

  // D103 · Guarda el cupo nuevo. Si es menor que las cuentas que ya cuentan (409), el diálogo sigue abierto y dice el número; cualquier otro fallo, también con su motivo.
  onQuotaApproved(maxUsers: number) {
    const company = this.changingQuota;
    if (!company || this.quotaSending) return;
    this.quotaSending = true;
    this.quotaError = null;
    this.companyService.updateMaxUsers(company.id, maxUsers).pipe(finalize(() => (this.quotaSending = false))).subscribe({
      next: () => {
        this.toast.showSuccess(
          this.translate.instant('COMPANIES_MODULE.QUOTA.SUCCESS_TITLE'),
          this.translate.instant('COMPANIES_MODULE.QUOTA.SUCCESS_MESSAGE', { name: company.name, max: maxUsers }),
        );
        this.changingQuota = null;
        this.readCompanies(this.companyService.page);
      },
      error: (err: Error & { code?: string; details?: Partial<MaxUsersBelowCurrent> }) => {
        this.quotaError =
          err.code === MAX_USERS_BELOW_CURRENT && typeof err.details?.users_count === 'number'
            ? this.translate.instant('COMPANIES_MODULE.QUOTA.BELOW_CURRENT_SERVER', { count: err.details.users_count })
            : err.message || this.translate.instant('COMPANIES_MODULE.QUOTA.ERROR_TITLE');
      },
    });
  }

  onFilterChange(archived: boolean) {
    this.companyService.statusFilter = archived ? 'deactivated' : null;
    this.companyService.companies = [];
    this.readCompanies(1);
  }

  onArchiveApproved(details: ArchiveDetails) {
    const company = this.archiving;
    if (!company) return;
    this.stepUp = { kind: 'archive', company, archive: details };
    this.archiving = null;
    this.stepUpError = null;
  }

  onReactivateApproved(details: ReactivateDetails) {
    const company = this.reactivating;
    if (!company) return;
    this.stepUp = { kind: 'reactivate', company, reactivate: details };
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
        ? this.companyService.archiveCompany(pending.company.id, { ...pending.archive, totp_code: code })
        : this.companyService.reactivateCompany(pending.company.id, { ...pending.reactivate, totp_code: code });
    this.stepUpSending = true;
    this.stepUpError = null;
    request.pipe(unwrapData(), finalize(() => (this.stepUpSending = false))).subscribe({
      next: (archived) => {
        this.toast.showSuccess(
          this.translate.instant(`COMPANIES_MODULE.${key}.SUCCESS_TITLE`),
          this.translate.instant(`COMPANIES_MODULE.${key}.SUCCESS_MESSAGE`, {
            name: archived.name,
            date: formatLocalDate(archived.archive_until, this.language.current()),
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
    this.isLoading = true;
    this.companyService.readCompanies(page).pipe(unwrapData()).subscribe({
      next: (data) => {
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
