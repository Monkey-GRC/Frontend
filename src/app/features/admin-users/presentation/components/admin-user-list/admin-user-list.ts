import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { AdminSort, AdminStatus, AdminUser, ADMIN_STATUS_FILTERS } from '@features/admin-users/models/admin-user.model';
import { AdminStatusBadge } from '@features/admin-users/presentation/components/admin-status-badge/admin-status-badge';
import { Busy } from '@shared/presentation/directives/busy';
import { DataTable, TableCell, TableColumn } from '@shared/presentation/components/data-table/data-table';
import { PageInfo } from '@shared/presentation/components/data-table/table-page';
import { PageHeader } from '@shared/presentation/components/page-header/page-header';
import { PersonCell } from '@shared/presentation/components/person-cell/person-cell';
import { TableFilter } from '@shared/presentation/components/table-filter/table-filter';
import { TableToolbar } from '@shared/presentation/components/table-toolbar/table-toolbar';
import { SelectOption } from '@shared/presentation/components/select/select';
import { LocalDatePipe } from '@shared/presentation/pipes/local-date.pipe';

const COLUMNS: TableColumn<AdminUser>[] = [
  { key: 'person', headerKey: 'ADMIN_USERS.LIST.COL_PERSON', skeleton: 'person' },
  { key: 'role', headerKey: 'ADMIN_USERS.LIST.COL_ROLE', skeleton: 'badge' },
  { key: 'status', headerKey: 'ADMIN_USERS.LIST.COL_STATUS', skeleton: 'badge' },
  { key: 'last_login', headerKey: 'ADMIN_USERS.LIST.COL_LAST_LOGIN' },
  { key: 'invited_by', headerKey: 'ADMIN_USERS.LIST.COL_INVITED_BY' },
  { key: 'actions', headerKey: 'ADMIN_USERS.LIST.COL_ACTIONS', align: 'right', srOnlyHeader: true, skeleton: 'actions' },
];

const SORTS: AdminSort[] = ['-created_at', 'created_at', 'email', '-email', 'purge_at'];

// La lista de administradores: filtro por estado, orden y acciones por fila. No pide datos ni abre diálogos: avisa lo que se pidió y la vista lo resuelve.
@Component({
  selector: 'app-admin-user-list',
  imports: [TranslatePipe, LocalDatePipe, PageHeader, DataTable, TableCell, PersonCell, TableToolbar, TableFilter, AdminStatusBadge, Busy],
  templateUrl: './admin-user-list.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminUserList {
  readonly rows = input.required<AdminUser[]>();
  readonly page = input.required<PageInfo>();
  readonly loading = input(false);
  // Falló la carga: se dice y se ofrece reintentar.
  readonly failed = input(false);
  readonly status = input<AdminStatus | ''>('');
  readonly sort = input<AdminSort>('-created_at');
  readonly currentUserId = input<string | null>(null);
  readonly resendingId = input<string | null>(null);

  readonly pageChange = output<number>();
  readonly statusChange = output<AdminStatus | ''>();
  readonly sortChange = output<AdminSort>();
  readonly resend = output<AdminUser>();
  readonly deactivate = output<AdminUser>();
  readonly reactivate = output<AdminUser>();
  readonly retry = output<void>();

  readonly columns = COLUMNS;
  readonly rowKey = (admin: AdminUser) => admin.id;
  readonly statusOptions: SelectOption[] = ADMIN_STATUS_FILTERS.map((value) => ({ value, labelKey: `ADMIN_USERS.STATUS.${value}` }));
  readonly sortOptions: SelectOption[] = SORTS.map((value) => ({ value, labelKey: `ADMIN_USERS.SORT.${value}` }));

  protected isSelf(admin: AdminUser): boolean {
    return admin.id === this.currentUserId();
  }

  protected fullName(admin: AdminUser): string {
    return `${admin.name} ${admin.last_name}`.trim();
  }

  protected onSort(value: string): void {
    this.sortChange.emit((value || '-created_at') as AdminSort);
  }
}
