import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, output, inject } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { AccessKeyStatus, Company, CompanyStatus } from '@shared/models/company.model';
import { CompanyService } from '@features/companies/services/company.service';
import { DataTable, TableCell, TableColumn } from '@shared/presentation/components/data-table/data-table';
import { PageInfo } from '@shared/presentation/components/data-table/table-page';
import { PageHeader } from '@shared/presentation/components/page-header/page-header';
import { StatusIndicator, StatusTone } from '@shared/presentation/components/status-indicator/status-indicator';
import { TabItem, Tabs } from '@shared/presentation/components/tabs/tabs';
import { Tag } from '@shared/presentation/components/tag/tag';

const COLUMNS: TableColumn<Company>[] = [
  { key: 'company', headerKey: 'COMPANIES_MODULE.LIST.COL_COMPANY' },
  { key: 'status', headerKey: 'COMPANIES_MODULE.LIST.COL_STATUS' },
  { key: 'frameworks', headerKey: 'COMPANIES_MODULE.LIST.COL_FRAMEWORKS' },
  { key: 'users', headerKey: 'COMPANIES_MODULE.LIST.COL_USERS' },
  { key: 'created', headerKey: 'COMPANIES_MODULE.LIST.COL_CREATED' },
  { key: 'actions', headerKey: 'COMPANIES_MODULE.LIST.COL_ACTIONS', align: 'right', srOnlyHeader: true },
];

@Component({
  selector: 'app-company-list',
  imports: [PageHeader, DatePipe, TranslateModule, DataTable, TableCell, StatusIndicator, Tag, Tabs],
  templateUrl: './company-list.html',
  changeDetection: ChangeDetectionStrategy.Default,
})
export class CompanyList {
  companyService = inject(CompanyService);

  pageChange = output<number>();
  // D97: el filtro (activas / archivadas) y las dos acciones; el diálogo y la llamada los resuelve la vista.
  filterChange = output<boolean>();
  archive = output<Company>();
  reactivate = output<Company>();
  // D99: reenviar la clave de acceso (con una nueva) a una empresa que aún no la canjeó.
  resendKey = output<Company>();
  // D103: cambiar el cupo de usuarios; el diálogo y la llamada los resuelve la vista.
  changeQuota = output<Company>();

  readonly columns = COLUMNS;
  // Las archivadas suman la fecha de borrado, antes de las acciones.
  readonly archivedColumns: TableColumn<Company>[] = [
    ...COLUMNS.slice(0, -1),
    { key: 'deletes', headerKey: 'COMPANIES_MODULE.LIST.COL_DELETES' },
    COLUMNS[COLUMNS.length - 1],
  ];
  readonly tabs: TabItem[] = [
    { id: 'active', labelKey: 'COMPANIES_MODULE.LIST.FILTER_ACTIVE' },
    { id: 'archived', labelKey: 'COMPANIES_MODULE.LIST.FILTER_ARCHIVED' },
  ];
  readonly rowKey = (company: Company) => company.id;

  // La paginación del servicio ya guarda página, tamaño, total y páginas: se arma el `PageInfo` de la tabla con eso.
  get pageInfo(): PageInfo {
    const { page, pageSize, total, totalPages } = this.companyService;
    return { page, pageSize, total, totalPages };
  }

  statusTone(status: CompanyStatus): StatusTone {
    return status === 'active' ? 'ok' : status === 'deactivated' ? 'warn' : 'neutral';
  }

  keyTone(status: AccessKeyStatus | null): StatusTone {
    return status === 'used' ? 'ok' : status === 'expired' ? 'warn' : 'neutral';
  }

  // La clave se puede reenviar mientras la empresa esté activa y no la haya canjeado.
  canResendKey(company: Company): boolean {
    return company.status === 'active' && company.access_key_status !== 'used';
  }

  // D103 · El cupo está lleno cuando las cuentas que cuentan ya igualan (o pasan) lo contratado; sin tope (`null`) nunca se llena.
  quotaFull(company: Company): boolean {
    return company.max_users !== null && company.users_count >= company.max_users;
  }

  get showingArchived(): boolean {
    return this.companyService.statusFilter === 'deactivated';
  }

  onboardingTone(company: Company): StatusTone {
    return company.onboarding_completed ? 'ok' : 'neutral';
  }

  onboardingKey(company: Company): string {
    return company.onboarding_completed ? 'COMPANIES_MODULE.LIST.ONBOARDED' : 'COMPANIES_MODULE.LIST.NOT_ONBOARDED';
  }

  // Días que faltan para el borrado definitivo (0 si es hoy o ya venció).
  daysLeft(company: Company): number {
    if (!company.archive_until) return 0;
    return Math.max(0, Math.ceil((new Date(company.archive_until).getTime() - Date.now()) / 86_400_000));
  }
}
