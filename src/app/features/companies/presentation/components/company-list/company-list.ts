import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, output } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { AccessKeyStatus, Company } from '@features/companies/models/company.model';
import { CompanyService } from '@features/companies/services/company.service';
import { PageHeader } from '@shared/presentation/components/page-header/page-header';

const KEY_STATUS_CLASSES: Record<AccessKeyStatus, string> = {
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  used: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  expired: 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
  revoked: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

@Component({
  selector: 'app-company-list',
  imports: [PageHeader, CommonModule, TranslateModule],
  templateUrl: './company-list.html',
  changeDetection: ChangeDetectionStrategy.Default,
})
export class CompanyList {
  pageChange = output<number>();
  // D95: el filtro (activas / archivadas) y las dos acciones; el diálogo y la llamada los resuelve la vista.
  filterChange = output<boolean>();
  archive = output<Company>();
  reactivate = output<Company>();

  constructor(public companyService: CompanyService) {}

  keyStatusClass(status: AccessKeyStatus | null): string {
    return status ? KEY_STATUS_CLASSES[status] : KEY_STATUS_CLASSES.expired;
  }

  get showingArchived(): boolean {
    return this.companyService.statusFilter === 'deactivated';
  }

  // Días que faltan para el borrado definitivo (0 si es hoy o ya venció).
  daysLeft(company: Company): number {
    if (!company.archive_until) return 0;
    return Math.max(0, Math.ceil((new Date(company.archive_until).getTime() - Date.now()) / 86_400_000));
  }
}
