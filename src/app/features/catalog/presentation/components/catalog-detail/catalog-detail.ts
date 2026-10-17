import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnChanges, SimpleChanges, input, output } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Observable } from 'rxjs';
import { CauseDetail, ControlDetail, RiskDetail, TestDetail } from '@features/catalog/models/catalog.model';
import { CatalogService } from '@features/catalog/services/catalog.service';

export type DetailKind = 'controls' | 'risks' | 'causes' | 'tests';
type Detail = ControlDetail | RiskDetail | CauseDetail | TestDetail;

// El detalle de un elemento del catálogo, en un panel a la derecha. Solo lectura. Pide el elemento al abrirse y cuando cambia el que se muestra.
@Component({
  selector: 'app-catalog-detail',
  imports: [CommonModule, TranslateModule],
  templateUrl: './catalog-detail.html',
  changeDetection: ChangeDetectionStrategy.Default,
})
export class CatalogDetail implements OnChanges {
  readonly kind = input.required<DetailKind>();
  readonly itemId = input.required<string>();
  readonly closed = output<void>();

  detail: Detail | null = null;
  loading = true;
  failed = false;

  constructor(
    private readonly catalog: CatalogService,
    private readonly translate: TranslateService,
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['kind'] || changes['itemId']) this.load();
  }

  load(): void {
    this.loading = true;
    this.failed = false;
    this.detail = null;
    this.request().subscribe({
      next: (detail) => {
        this.detail = detail;
        this.loading = false;
      },
      error: () => {
        this.failed = true;
        this.loading = false;
      },
    });
  }

  /** Los campos del comité de una prueba, en el orden en que se leen. Las listas (`step_by_step`…) salen como lista. */
  committeeFields(test: TestDetail): { key: string; value: unknown; list: boolean }[] {
    return Object.entries(test.committee).map(([key, value]) => ({ key, value, list: Array.isArray(value) }));
  }

  list(value: unknown): string[] {
    return Array.isArray(value) ? value.map((v) => (typeof v === 'string' ? v : JSON.stringify(v))) : [];
  }

  label(prefix: string, value: string | null | undefined): string {
    if (!value) return '—';
    const key = `${prefix}.${value.toUpperCase()}`;
    const text = this.translate.instant(key);
    return text === key ? value : text;
  }

  private request(): Observable<Detail> {
    const id = this.itemId();
    switch (this.kind()) {
      case 'controls':
        return this.catalog.control(id);
      case 'risks':
        return this.catalog.risk(id);
      case 'causes':
        return this.catalog.cause(id);
      case 'tests':
        return this.catalog.test(id);
    }
  }
}
