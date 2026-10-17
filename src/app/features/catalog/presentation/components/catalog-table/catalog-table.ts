import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { CatalogOrigin } from '@features/catalog/models/catalog.model';

export type CatalogRow = { id: string } & Record<string, unknown>;

// Cómo se pinta una celda: `code` en monoespaciada, `origin` y `active` como etiquetas, `count` alineado a la derecha, `enum` con el texto de su valor.
export interface CatalogColumn {
  key: string;
  labelKey: string;
  kind?: 'code' | 'text' | 'count' | 'origin' | 'active' | 'enum' | 'list';
  /** Para `enum` y `list`: prefijo de las traducciones (`CATALOG_MODULE.DIMENSION` → `CATALOG_MODULE.DIMENSION.SERVER`). */
  enumPrefix?: string;
}

// La tabla de cualquiera de las listas del catálogo: la misma forma con distintas columnas. Sin lógica de negocio; emite la fila que se pulsa y la página pedida.
@Component({
  selector: 'app-catalog-table',
  imports: [CommonModule, TranslateModule],
  templateUrl: './catalog-table.html',
  changeDetection: ChangeDetectionStrategy.Default,
})
export class CatalogTable {
  readonly columns = input.required<CatalogColumn[]>();
  readonly rows = input.required<CatalogRow[]>();
  readonly page = input(1);
  readonly totalPages = input(1);
  readonly captionKey = input.required<string>();
  /** Solo las filas con detalle se pueden abrir. */
  readonly clickable = input(true);
  readonly selectedId = input<string | null>(null);

  readonly rowClick = output<CatalogRow>();
  readonly pageChange = output<number>();

  constructor(private readonly translate: TranslateService) {}

  text(row: CatalogRow, column: CatalogColumn): string {
    const value = row[column.key];
    if (value === null || value === undefined || value === '') return '—';
    if (column.kind === 'enum') return this.label(column.enumPrefix, String(value));
    if (column.kind === 'list' && Array.isArray(value)) return value.length ? value.map((v) => this.label(column.enumPrefix, String(v))).join(', ') : '—';
    return String(value);
  }

  originClass(origin: CatalogOrigin): string {
    return origin === 'monkey_admin' ? 'bg-primary/10 text-primary' : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
  }

  private label(prefix: string | undefined, value: string): string {
    if (!prefix) return value;
    const key = `${prefix}.${value.toUpperCase()}`;
    const text = this.translate.instant(key);
    return text === key ? value : text;
  }
}
