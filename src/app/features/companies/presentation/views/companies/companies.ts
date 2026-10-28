import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, ViewChild } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Company, RegisteredCompany } from '@features/companies/models/company.model';
import { CompanyService } from '@features/companies/services/company.service';
import { AccessKeyReveal } from '@features/companies/presentation/components/access-key-reveal/access-key-reveal';
import { ArchiveDetails, CompanyArchiveForm } from '@features/companies/presentation/components/company-archive-form/company-archive-form';
import { CompanyForm } from '@features/companies/presentation/components/company-form/company-form';
import { CompanyReactivateForm, ReactivateDetails } from '@features/companies/presentation/components/company-reactivate-form/company-reactivate-form';
import { CompanyList } from '@features/companies/presentation/components/company-list/company-list';
import { StepUpForm } from '@shared/presentation/components/step-up-form/step-up-form';
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
    StepUpForm,
    AccessKeyReveal,
    DialogComponent,
    LoaderComponent,
  ],
  templateUrl: './companies.html',
  changeDetection: ChangeDetectionStrategy.Default,
})
export class Companies implements OnInit {
  isLoading = false;
  isFormVisible = false;
  // La empresa recién registrada, mientras se muestra su clave. Al cerrar se descarta: la clave
  // no se vuelve a pedir al backend (no puede: solo existe su hash).
  registered: RegisteredCompany | null = null;

  // D95: la empresa que se está archivando o reactivando (el diálogo abierto).
  archiving: Company | null = null;
  reactivating: Company | null = null;

  @ViewChild(CompanyForm) companyForm?: CompanyForm;
  // D95: tras aprobar el formulario se pide el código de seguridad; aquí queda lo aprobado mientras se escribe.
  stepUp: { kind: 'archive' | 'reactivate'; company: Company; archive?: ArchiveDetails; reactivate?: ReactivateDetails } | null = null;
  stepUpSending = false;

  @ViewChild(CompanyArchiveForm) archiveForm?: CompanyArchiveForm;
  @ViewChild(CompanyReactivateForm) reactivateForm?: CompanyReactivateForm;
  @ViewChild(StepUpForm) stepUpForm?: StepUpForm;

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

  onFilterChange(archived: boolean) {
    this.companyService.statusFilter = archived ? 'deactivated' : null;
    this.companyService.companies = [];
    this.readCompanies(1);
  }

  onArchiveApproved(details: ArchiveDetails) {
    this.stepUp = { kind: 'archive', company: this.archiving!, archive: details };
    this.archiving = null;
  }

  onReactivateApproved(details: ReactivateDetails) {
    this.stepUp = { kind: 'reactivate', company: this.reactivating!, reactivate: details };
    this.reactivating = null;
  }

  // Con el código escrito se envía lo aprobado. Si falla (código equivocado, por ejemplo) el diálogo sigue abierto para volver a escribirlo.
  onStepUpConfirmed(code: string) {
    const pending = this.stepUp;
    if (!pending || this.stepUpSending) return;
    const key = pending.kind === 'archive' ? 'ARCHIVE' : 'REACTIVATE';
    const request =
      pending.kind === 'archive'
        ? this.companyService.archiveCompany(pending.company.id, { ...pending.archive!, totp_code: code })
        : this.companyService.reactivateCompany(pending.company.id, { ...pending.reactivate!, totp_code: code });
    this.stepUpSending = true;
    request.pipe(finalize(() => (this.stepUpSending = false))).subscribe({
      next: (resp) => {
        this.toast.showSuccess(
          this.translate.instant(`COMPANIES_MODULE.${key}.SUCCESS_TITLE`),
          this.translate.instant(`COMPANIES_MODULE.${key}.SUCCESS_MESSAGE`, {
            name: resp.data!.name,
            date: resp.data!.archive_until ? new Date(resp.data!.archive_until).toLocaleDateString() : '',
          }),
        );
        this.stepUp = null;
        this.readCompanies(1);
      },
      error: (err: Error) => {
        this.stepUpForm?.reset();
        this.toast.showError(this.translate.instant(`COMPANIES_MODULE.${key}.ERROR_TITLE`), err.message, 6000);
      },
    });
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
