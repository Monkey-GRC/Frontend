import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, ViewChild } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { RegisteredCompany } from '@features/companies/models/company.model';
import { CompanyService } from '@features/companies/services/company.service';
import { AccessKeyReveal } from '@features/companies/presentation/components/access-key-reveal/access-key-reveal';
import { CompanyForm } from '@features/companies/presentation/components/company-form/company-form';
import { CompanyList } from '@features/companies/presentation/components/company-list/company-list';
import { DialogComponent } from '@shared/presentation/components/dialog/dialog';
import { LoaderComponent } from '@shared/presentation/components/loader/loader.component';
import { ToastService } from '@shared/services/toast.service';

@Component({
  selector: 'app-companies',
  imports: [
    CommonModule,
    TranslateModule,
    CompanyList,
    CompanyForm,
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

  @ViewChild(CompanyForm) companyForm?: CompanyForm;

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
