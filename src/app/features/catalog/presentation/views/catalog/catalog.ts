import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnDestroy, OnInit } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { Observable, Subject, Subscription, debounceTime, distinctUntilChanged } from 'rxjs';
import { CatalogFilters, CatalogFramework, CatalogOrigin, CatalogTab, ControlScope, Paginated } from '@features/catalog/models/catalog.model';
import { CatalogService } from '@features/catalog/services/catalog.service';
import { CatalogColumn, CatalogRow, CatalogTable } from '@features/catalog/presentation/components/catalog-table/catalog-table';
import { CatalogDetail, DetailKind } from '@features/catalog/presentation/components/catalog-detail/catalog-detail';
import { LoaderComponent } from '@shared/presentation/components/loader/loader.component';

const BADGES: CatalogColumn[] = [
  { key: 'origin', labelKey: 'CATALOG_MODULE.COL.ORIGIN', kind: 'origin' },
  { key: 'is_active', labelKey: 'CATALOG_MODULE.COL.STATE', kind: 'active' },
];

// Las columnas de cada lista. Los controles, riesgos, causas y pruebas se pueden abrir; las plantillas de evidencia no tienen detalle propio.
const COLUMNS: Record<CatalogTab, CatalogColumn[]> = {
  controls: [
    { key: 'code', labelKey: 'CATALOG_MODULE.COL.CODE', kind: 'code' },
    { key: 'name', labelKey: 'CATALOG_MODULE.COL.NAME' },
    { key: 'domain', labelKey: 'CATALOG_MODULE.COL.DOMAIN' },
    { key: 'dimensions', labelKey: 'CATALOG_MODULE.COL.DIMENSIONS', kind: 'list', enumPrefix: 'CATALOG_MODULE.DIMENSION' },
    { key: 'tests_count', labelKey: 'CATALOG_MODULE.COL.TESTS', kind: 'count' },
    { key: 'evidence_templates_count', labelKey: 'CATALOG_MODULE.COL.EVIDENCE', kind: 'count' },
    ...BADGES,
  ],
  risks: [
    { key: 'code', labelKey: 'CATALOG_MODULE.COL.CODE', kind: 'code' },
    { key: 'name', labelKey: 'CATALOG_MODULE.COL.NAME' },
    { key: 'trust_criterion', labelKey: 'CATALOG_MODULE.COL.CRITERION', kind: 'enum', enumPrefix: 'CATALOG_MODULE.RISK_CRITERION' },
    { key: 'causes_count', labelKey: 'CATALOG_MODULE.COL.CAUSES', kind: 'count' },
    ...BADGES,
  ],
  causes: [
    { key: 'code', labelKey: 'CATALOG_MODULE.COL.CODE', kind: 'code' },
    { key: 'name', labelKey: 'CATALOG_MODULE.COL.NAME' },
    { key: 'failure_category', labelKey: 'CATALOG_MODULE.COL.CATEGORY', kind: 'enum', enumPrefix: 'CATALOG_MODULE.FAILURE_CATEGORY' },
    { key: 'risks_count', labelKey: 'CATALOG_MODULE.COL.RISKS', kind: 'count' },
    { key: 'controls_count', labelKey: 'CATALOG_MODULE.COL.CONTROLS', kind: 'count' },
    ...BADGES,
  ],
  tests: [
    { key: 'code', labelKey: 'CATALOG_MODULE.COL.CODE', kind: 'code' },
    { key: 'display_name', labelKey: 'CATALOG_MODULE.COL.CLIENT_NAME' },
    { key: 'name', labelKey: 'CATALOG_MODULE.COL.COMMITTEE_NAME' },
    { key: 'dimension', labelKey: 'CATALOG_MODULE.COL.DIMENSION', kind: 'enum', enumPrefix: 'CATALOG_MODULE.DIMENSION' },
    { key: 'controls_count', labelKey: 'CATALOG_MODULE.COL.CONTROLS', kind: 'count' },
    ...BADGES,
  ],
  'evidence-templates': [
    { key: 'code', labelKey: 'CATALOG_MODULE.COL.CODE', kind: 'code' },
    { key: 'description', labelKey: 'CATALOG_MODULE.COL.DESCRIPTION' },
    { key: 'dimension', labelKey: 'CATALOG_MODULE.COL.DIMENSION', kind: 'enum', enumPrefix: 'CATALOG_MODULE.DIMENSION' },
    { key: 'controls_count', labelKey: 'CATALOG_MODULE.COL.CONTROLS', kind: 'count' },
    ...BADGES,
  ],
};

const DIMENSIONS = ['policy', 'server', 'database', 'app', 'cloud'];

// Catálogo maestro (contracts/modules/monkey-admin-catalog.md): los marcos, y sus controles, riesgos, causas, pruebas y evidencias requeridas. Solo lectura.
// Solo los controles cuelgan de un marco; riesgos, causas y pruebas son un pool compartido, así que el marco elegido solo acota la pestaña de controles.
@Component({
  selector: 'app-catalog',
  imports: [CommonModule, TranslateModule, CatalogTable, CatalogDetail, LoaderComponent],
  templateUrl: './catalog.html',
  changeDetection: ChangeDetectionStrategy.Default,
})
export class Catalog implements OnInit, OnDestroy {
  readonly tabs: { key: CatalogTab; labelKey: string }[] = [
    { key: 'controls', labelKey: 'CATALOG_MODULE.TABS.CONTROLS' },
    { key: 'risks', labelKey: 'CATALOG_MODULE.TABS.RISKS' },
    { key: 'causes', labelKey: 'CATALOG_MODULE.TABS.CAUSES' },
    { key: 'tests', labelKey: 'CATALOG_MODULE.TABS.TESTS' },
    { key: 'evidence-templates', labelKey: 'CATALOG_MODULE.TABS.EVIDENCE' },
  ];
  readonly dimensions = DIMENSIONS;

  tab: CatalogTab = 'controls';
  frameworks: CatalogFramework[] = [];
  frameworkId: string | null = null;
  scope: ControlScope = 'framework';
  search = '';
  origin: CatalogOrigin | '' = '';
  state: 'active' | 'inactive' | '' = '';
  noEvidence = false;
  dimension = '';
  page = 1;

  rows: CatalogRow[] = [];
  total = 0;
  totalPages = 1;
  loading = true;
  failed = false;
  selected: { kind: DetailKind; id: string } | null = null;

  private readonly typing = new Subject<string>();
  private subscription?: Subscription;
  private request = 0;

  constructor(private readonly catalog: CatalogService) {}

  ngOnInit(): void {
    // La búsqueda espera a que se deje de escribir para no pedir una página por cada letra.
    this.subscription = this.typing.pipe(debounceTime(300), distinctUntilChanged()).subscribe((text) => {
      this.search = text;
      this.reload(1);
    });
    this.catalog.frameworks().subscribe({
      next: (list) => {
        this.frameworks = list;
        this.frameworkId = (list.find((f) => f.availability === 'available') ?? list[0])?.id ?? null;
        this.reload(1);
      },
      error: () => this.fail(),
    });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  get columns(): CatalogColumn[] {
    return COLUMNS[this.tab];
  }

  get captionKey(): string {
    return this.tabs.find((t) => t.key === this.tab)!.labelKey;
  }

  get detailKind(): DetailKind | null {
    return this.tab === 'evidence-templates' ? null : this.tab;
  }

  get currentFramework(): CatalogFramework | null {
    return this.frameworks.find((f) => f.id === this.frameworkId) ?? null;
  }

  pickTab(tab: CatalogTab): void {
    if (tab === this.tab) return;
    this.tab = tab;
    this.selected = null;
    this.reload(1);
  }

  pickFramework(id: string): void {
    this.frameworkId = id;
    this.scope = 'framework';
    this.reload(1);
  }

  setScope(value: string): void {
    this.scope = value as ControlScope;
    this.reload(1);
  }

  onSearch(text: string): void {
    this.typing.next(text.trim());
  }

  setOrigin(value: string): void {
    this.origin = value as CatalogOrigin | '';
    this.reload(1);
  }

  setState(value: string): void {
    this.state = value as 'active' | 'inactive' | '';
    this.reload(1);
  }

  setNoEvidence(checked: boolean): void {
    this.noEvidence = checked;
    this.reload(1);
  }

  setDimension(value: string): void {
    this.dimension = value;
    this.reload(1);
  }

  open(row: CatalogRow): void {
    const kind = this.detailKind;
    if (kind) this.selected = { kind, id: row.id };
  }

  reload(page: number): void {
    this.page = page;
    this.loading = true;
    this.failed = false;
    const token = ++this.request;
    const filters = this.filters();
    const call = this.call(filters);
    if (!call) {
      this.rows = [];
      this.total = 0;
      this.totalPages = 1;
      this.loading = false;
      return;
    }
    call.subscribe({
      next: (data) => {
        if (token !== this.request) return; // llegó tarde: ya se pidió otra cosa
        this.rows = data.items as CatalogRow[];
        this.total = data.total;
        this.totalPages = data.total_pages;
        this.loading = false;
      },
      error: () => {
        if (token === this.request) this.fail();
      },
    });
  }

  private fail(): void {
    this.failed = true;
    this.loading = false;
  }

  private filters(): CatalogFilters {
    const filters: CatalogFilters = { page: this.page, search: this.search || undefined, origin: this.origin || undefined };
    if (this.state) filters.is_active = this.state === 'active';
    if (this.tab === 'controls') {
      if (this.scope === 'framework') filters.framework_id = this.frameworkId ?? undefined;
      if (this.scope === 'unlinked') filters.unlinked = true;
      if (this.noEvidence) filters.has_evidence_template = false;
    }
    if (this.tab === 'tests' && this.dimension) filters.dimension = this.dimension;
    return filters;
  }

  private call(filters: CatalogFilters): Observable<Paginated<unknown>> | null {
    // Sin marco elegido (aún cargando los marcos) no hay controles que pedir en ese ámbito.
    if (this.tab === 'controls' && this.scope === 'framework' && !this.frameworkId) return null;
    switch (this.tab) {
      case 'controls':
        return this.catalog.controls(filters);
      case 'risks':
        return this.catalog.risks(filters);
      case 'causes':
        return this.catalog.causes(filters);
      case 'tests':
        return this.catalog.tests(filters);
      case 'evidence-templates':
        return this.catalog.evidenceTemplates(filters);
    }
  }
}
