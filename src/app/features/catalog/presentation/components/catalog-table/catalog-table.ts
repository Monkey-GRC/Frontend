import { ChangeDetectionStrategy, Component, computed, input, output, inject } from '@angular/core';
import { CatalogOptionsService } from '@features/catalog/services/catalog-options.service';
import { OptionName } from '@features/catalog/models/catalog.model';
import { CATALOG_PAGE_SIZE } from '@features/catalog/services/catalog.service';
import { DataTable, TableCell, TableColumn } from '@shared/presentation/components/data-table/data-table';
import { PageInfo } from '@shared/presentation/components/data-table/table-page';
import { StatusIndicator, StatusTone } from '@shared/presentation/components/status-indicator/status-indicator';
import { Badge } from '@shared/presentation/components/badge/badge';
import { Tag } from '@shared/presentation/components/tag/tag';

export type CatalogRow = { id: string } & Record<string, unknown>;

// Cómo se pinta una celda: `code` como código, `active` como estado, `count` alineado a la derecha, `enum` y `list` con el texto de su valor y `origin` con el texto de su origen.
export interface CatalogColumn {
  key: string;
  labelKey: string;
  kind?: 'code' | 'text' | 'count' | 'origin' | 'active' | 'enum' | 'list';
  /** Para `enum` y `list`: la lista del backend de la que sale el texto de cada valor. */
  options?: OptionName;
}

// La tabla de cualquiera de las listas del catálogo: la misma forma con distintas columnas, sobre `app-data-table`. Sin lógica de negocio; emite la fila que se pulsa y la página
// pedida. El servicio entrega página y total (el tamaño de página es el del catálogo), con lo que se arma el `PageInfo` de la tabla.
@Component({
  selector: 'app-catalog-table',
  imports: [DataTable, TableCell, Tag, StatusIndicator, Badge],
  templateUrl: './catalog-table.html',
  changeDetection: ChangeDetectionStrategy.Default,
})
export class CatalogTable {
  private readonly options = inject(CatalogOptionsService);

  readonly columns = input.required<CatalogColumn[]>();
  readonly rows = input.required<CatalogRow[]>();
  readonly page = input(1);
  readonly total = input(0);
  readonly totalPages = input(1);
  readonly captionKey = input.required<string>();
  /** Solo las filas con detalle se pueden abrir. */
  readonly clickable = input(true);
  /** Loading (D116): skeleton rows with the real columns while the page is requested. */
  readonly loading = input(false);

  readonly rowClick = output<CatalogRow>();
  readonly pageChange = output<number>();

  readonly rowKey = (row: CatalogRow) => row.id;
  readonly rowLabel = (row: CatalogRow) => String(row['code'] ?? row['name'] ?? row.id);

  readonly pageInfo = computed<PageInfo>(() => ({ page: this.page(), pageSize: CATALOG_PAGE_SIZE, total: this.total(), totalPages: this.totalPages() }));

  readonly tableColumns = computed<TableColumn<CatalogRow>[]>(() =>
    this.columns().map((column) => ({
      key: column.key,
      headerKey: column.labelKey,
      align: column.kind === 'count' ? 'right' : 'left',
      skeleton: column.kind === 'code' || column.kind === 'active' || this.isBadge(column) ? 'badge' : 'text',
      value: column.kind === 'code' || column.kind === 'active' || this.isBadge(column) ? undefined : (row: CatalogRow) => this.text(row, column),
    })),
  );

  /** Las columnas `enum` y `list` pintan un distintivo de atributo por valor. */
  readonly badgeColumns = computed(() => this.columns().filter((column) => this.isBadge(column)));

  /** Un valor por distintivo: el color sale del valor estable del contrato y el texto, de su traducción. */
  badgesOf(row: CatalogRow, column: CatalogColumn): { value: string; label: string }[] {
    const raw = row[column.key];
    const values = Array.isArray(raw) ? raw : raw === null || raw === undefined || raw === '' ? [] : [raw];
    return values.map((v) => ({ value: String(v), label: this.label(column.options, String(v)) }));
  }

  private isBadge(column: CatalogColumn): boolean {
    return column.kind === 'enum' || column.kind === 'list';
  }

  codeOf(row: CatalogRow): string {
    return String(row['code'] ?? '');
  }

  statusTone(row: CatalogRow): StatusTone {
    return row['is_active'] ? 'ok' : 'neutral';
  }

  statusKey(row: CatalogRow): string {
    return row['is_active'] ? 'CATALOG_MODULE.STATE.ACTIVE' : 'CATALOG_MODULE.STATE.INACTIVE';
  }

  text(row: CatalogRow, column: CatalogColumn): string {
    const value = row[column.key];
    if (value === null || value === undefined || value === '') return '—';
    if (column.kind === 'origin') return this.options.label('catalog_origin', String(value));
    if (column.kind === 'enum') return this.label(column.options, String(value));
    if (column.kind === 'list' && Array.isArray(value)) return value.length ? value.map((v) => this.label(column.options, String(v))).join(', ') : '—';
    return String(value);
  }

  private label(name: OptionName | undefined, value: string): string {
    return name ? this.options.label(name, value) : value;
  }
}
