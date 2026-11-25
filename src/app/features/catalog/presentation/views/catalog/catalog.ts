import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Observable, Subject, Subscription, debounceTime, distinctUntilChanged } from 'rxjs';
import { CatalogFilters, CatalogFramework, CatalogOrigin, CatalogTab, ControlScope, FormKind, Paginated } from '@features/catalog/models/catalog.model';
import { CatalogOptionsService } from '@features/catalog/services/catalog-options.service';
import { CatalogService } from '@features/catalog/services/catalog.service';
import { CatalogColumn, CatalogRow, CatalogTable } from '@features/catalog/presentation/components/catalog-table/catalog-table';
import { CatalogDetail, DetailKind, EditRequest } from '@features/catalog/presentation/components/catalog-detail/catalog-detail';
import { CatalogForm } from '@features/catalog/presentation/components/catalog-form/catalog-form';
import { Skeleton, SkeletonRegion } from '@shared/presentation/components/skeleton/skeleton';
import { EmptyState } from '@shared/presentation/components/empty-state/empty-state';
import { PageHeader } from '@shared/presentation/components/page-header/page-header';
import { Select, SelectOption } from '@shared/presentation/components/select/select';
import { StatusIndicator } from '@shared/presentation/components/status-indicator/status-indicator';
import { TableFilter, TableFilterOption } from '@shared/presentation/components/table-filter/table-filter';
import { TableToolbar } from '@shared/presentation/components/table-toolbar/table-toolbar';
import { TabItem, Tabs } from '@shared/presentation/components/tabs/tabs';
import { targetChecked } from '@shared/presentation/utils/event-target';
import { ToastService } from '@shared/presentation/components/toast-container/toast.service';

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
    { key: 'dimensions', labelKey: 'CATALOG_MODULE.COL.DIMENSIONS', kind: 'list', options: 'dimension' },
    { key: 'tests_count', labelKey: 'CATALOG_MODULE.COL.TESTS', kind: 'count' },
    { key: 'evidence_templates_count', labelKey: 'CATALOG_MODULE.COL.EVIDENCE', kind: 'count' },
    ...BADGES,
  ],
  risks: [
    { key: 'code', labelKey: 'CATALOG_MODULE.COL.CODE', kind: 'code' },
    { key: 'name', labelKey: 'CATALOG_MODULE.COL.NAME' },
    { key: 'trust_criterion', labelKey: 'CATALOG_MODULE.COL.CRITERION', kind: 'enum', options: 'risk_criterion' },
    { key: 'causes_count', labelKey: 'CATALOG_MODULE.COL.CAUSES', kind: 'count' },
    ...BADGES,
  ],
  causes: [
    { key: 'code', labelKey: 'CATALOG_MODULE.COL.CODE', kind: 'code' },
    { key: 'name', labelKey: 'CATALOG_MODULE.COL.NAME' },
    { key: 'failure_category', labelKey: 'CATALOG_MODULE.COL.CATEGORY', kind: 'enum', options: 'failure_category' },
    { key: 'risks_count', labelKey: 'CATALOG_MODULE.COL.RISKS', kind: 'count' },
    { key: 'controls_count', labelKey: 'CATALOG_MODULE.COL.CONTROLS', kind: 'count' },
    ...BADGES,
  ],
  tests: [
    { key: 'code', labelKey: 'CATALOG_MODULE.COL.CODE', kind: 'code' },
    { key: 'display_name', labelKey: 'CATALOG_MODULE.COL.CLIENT_NAME' },
    { key: 'name', labelKey: 'CATALOG_MODULE.COL.COMMITTEE_NAME' },
    { key: 'dimension', labelKey: 'CATALOG_MODULE.COL.DIMENSION', kind: 'enum', options: 'dimension' },
    { key: 'controls_count', labelKey: 'CATALOG_MODULE.COL.CONTROLS', kind: 'count' },
    ...BADGES,
  ],
  'evidence-templates': [
    { key: 'code', labelKey: 'CATALOG_MODULE.COL.CODE', kind: 'code' },
    { key: 'description', labelKey: 'CATALOG_MODULE.COL.DESCRIPTION' },
    { key: 'dimension', labelKey: 'CATALOG_MODULE.COL.DIMENSION', kind: 'enum', options: 'dimension' },
    { key: 'controls_count', labelKey: 'CATALOG_MODULE.COL.CONTROLS', kind: 'count' },
    ...BADGES,
  ],
};

const NEW_KIND: Record<CatalogTab, FormKind> = { controls: 'control', risks: 'risk', causes: 'cause', tests: 'test', 'evidence-templates': 'template' };

// Catálogo maestro (contracts/modules/monkey-admin-catalog.md): los marcos, y sus controles, riesgos, causas, pruebas y evidencias requeridas. Solo lectura.
// Solo los controles cuelgan de un marco; riesgos, causas y pruebas son un pool compartido, así que el marco elegido solo acota la pestaña de controles.
// El marco elegido (`?marco=soc2`), la lista (`?lista=`) y el elemento abierto con su pestaña (`?abrir=<id>&tab=`) van en la dirección, para compartir la vista; el detalle se abre sobre la lista.
// Desde aquí se agrega un elemento nuevo (botón «Nuevo»); editar, dar de baja y vincular se hace desde su detalle.
@Component({
  selector: 'app-catalog',
  imports: [PageHeader, TranslateModule, CatalogTable, CatalogDetail, CatalogForm, Skeleton, SkeletonRegion, EmptyState, StatusIndicator, TableFilter, TableToolbar, Tabs, Select],
  templateUrl: './catalog.html',
  changeDetection: ChangeDetectionStrategy.Default,
})
export class Catalog implements OnInit, OnDestroy {
  private readonly catalog = inject(CatalogService);
  private readonly translate = inject(TranslateService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  readonly options = inject(CatalogOptionsService);

  protected readonly targetChecked = targetChecked;
  readonly tabs: { key: CatalogTab; labelKey: string }[] = [
    { key: 'controls', labelKey: 'CATALOG_MODULE.TABS.CONTROLS' },
    { key: 'risks', labelKey: 'CATALOG_MODULE.TABS.RISKS' },
    { key: 'causes', labelKey: 'CATALOG_MODULE.TABS.CAUSES' },
    { key: 'tests', labelKey: 'CATALOG_MODULE.TABS.TESTS' },
    { key: 'evidence-templates', labelKey: 'CATALOG_MODULE.TABS.EVIDENCE' },
  ];

  readonly tabItems: TabItem[] = this.tabs.map((t) => ({ id: t.key, labelKey: t.labelKey }));
  readonly stateOptions: TableFilterOption[] = [
    { value: 'active', labelKey: 'CATALOG_MODULE.STATE.ACTIVE' },
    { value: 'inactive', labelKey: 'CATALOG_MODULE.STATE.INACTIVE' },
  ];

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
  form: { mode: 'create' | 'edit'; kind: FormKind; id: string | null; initial: Record<string, unknown> } | null = null;
  @ViewChild(CatalogDetail) private detailPanel?: CatalogDetail;

  private readonly typing = new Subject<string>();
  private subscription?: Subscription;
  private urlSubscription?: Subscription;
  /** La pestaña del detalle abierto (`?tab=`). */
  detailTab: string | null = null;
  private request = 0;
  private frameworksLoaded = false;

  ngOnInit(): void {
    this.options.load(['dimension', 'control_type', 'risk_criterion', 'failure_category', 'catalog_origin']).subscribe();
    // La búsqueda espera a que se deje de escribir para no pedir una página por cada letra.
    this.subscription = this.typing.pipe(debounceTime(300), distinctUntilChanged()).subscribe((text) => {
      this.search = text;
      this.reload(1);
    });
    // La lista, el elemento abierto y su pestaña salen de la dirección (`?lista=&abrir=<id>&tab=`): se puede compartir, y «Atrás» vuelve al elemento y a la lista de antes.
    this.urlSubscription = this.route.queryParamMap.subscribe((q) => {
      const tab = this.tabs.find((t) => t.key === q.get('lista'))?.key ?? 'controls';
      if (tab !== this.tab) {
        this.tab = tab;
        // Antes de tener los marcos, la primera lista la pide su respuesta.
        if (this.frameworksLoaded) this.reload(1);
      }
      const id = q.get('abrir');
      this.selected = id ? { kind: tab, id } : null;
      this.detailTab = q.get('tab');
    });
    const wantedFramework = this.route.snapshot.queryParamMap.get('marco')?.toLowerCase();
    this.catalog.frameworks().subscribe({
      next: (list) => {
        this.frameworks = list;
        this.frameworksLoaded = true;
        // El marco de la dirección; si no hay o no existe, el primero disponible.
        this.frameworkId = (list.find((f) => f.code.toLowerCase() === wantedFramework) ?? list.find((f) => f.availability === 'available') ?? list[0])?.id ?? null;
        this.reload(1);
      },
      error: () => this.fail(),
    });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
    this.urlSubscription?.unsubscribe();
  }

  get columns(): CatalogColumn[] {
    return COLUMNS[this.tab];
  }

  get captionKey(): string {
    return this.tabs.find((t) => t.key === this.tab)?.labelKey ?? '';
  }

  /** Todas las listas se pueden abrir; cada una tiene su detalle (la plantilla de evidencia, uno corto). */
  get detailKind(): DetailKind {
    return this.tab;
  }

  /** Qué se crea con el botón «Nuevo» de la pestaña abierta. */
  get newKind(): FormKind {
    return NEW_KIND[this.tab];
  }

  /** Los ámbitos de la lista de controles: el marco abierto, todo el catálogo o los controles sin requisito. */
  get scopeOptions(): TableFilterOption[] {
    return [
      { value: 'framework', label: this.currentFramework?.name ?? '' },
      { value: 'all', labelKey: 'CATALOG_MODULE.SCOPE.ALL' },
      { value: 'unlinked', labelKey: 'CATALOG_MODULE.SCOPE.UNLINKED' },
    ];
  }

  get currentFramework(): CatalogFramework | null {
    return this.frameworks.find((f) => f.id === this.frameworkId) ?? null;
  }

  /** `app-tabs` emits the id as text: only a tab of this view counts. */
  onTab(id: string): void {
    const tab = this.tabs.find((t) => t.key === id);
    if (tab) this.pickTab(tab.key);
  }

  pickTab(tab: CatalogTab): void {
    if (tab === this.tab) return;
    this.tab = tab;
    this.selected = null;
    this.syncUrl(true);
    this.reload(1);
  }

  pickFramework(id: string): void {
    this.frameworkId = id;
    this.scope = 'framework';
    this.syncUrl();
    this.reload(1);
  }

  /** Los marcos para el selector, en dos grupos: los disponibles y, al final, los que llegan pronto; cada uno con su versión. */
  get frameworkOptions(): SelectOption[] {
    const rank = (f: CatalogFramework) => (f.availability === 'available' ? 0 : 1);
    return [...this.frameworks]
      .sort((a, b) => rank(a) - rank(b))
      .map((f) => ({
        value: f.id,
        labelKey: 'CATALOG_MODULE.FRAMEWORK_OPTION',
        labelParams: { name: f.name, version: f.version },
        group: f.availability === 'available' ? 'CATALOG_MODULE.FRAMEWORK_GROUP.AVAILABLE' : 'CATALOG_MODULE.FRAMEWORK_GROUP.COMING_SOON',
      }));
  }

  /** El marco elegido todavía no tiene catálogo: la pestaña de controles dice que llega pronto, en vez de una lista vacía sin explicación. */
  get comingSoon(): boolean {
    return this.tab === 'controls' && this.scope === 'framework' && this.currentFramework?.availability === 'coming_soon';
  }

  /** Pone el marco y la lista en la dirección; cambiar de lista cierra el detalle abierto. */
  private syncUrl(closeDetail = false): void {
    const code = this.currentFramework?.code.toLowerCase() ?? null;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { marco: code, lista: this.tab === 'controls' ? null : this.tab, ...(closeDetail ? { abrir: null, tab: null } : {}) },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
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
    this.show(this.detailKind, row.id);
  }

  /** Abre un elemento (también el de una lista vinculada de otro tipo, que cambia de pestaña) poniéndolo en la dirección. */
  show(kind: DetailKind, id: string): void {
    if (kind !== this.tab) {
      this.tab = kind;
      this.reload(1);
    }
    this.selected = { kind, id };
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { lista: kind === 'controls' ? null : kind, abrir: id, tab: null },
      queryParamsHandling: 'merge',
    });
  }

  closeDetail(): void {
    this.selected = null;
    this.router.navigate([], { relativeTo: this.route, queryParams: { abrir: null, tab: null }, queryParamsHandling: 'merge', replaceUrl: true });
  }

  setDetailTab(tab: string): void {
    this.router.navigate([], { relativeTo: this.route, queryParams: { tab: tab === 'summary' ? null : tab }, queryParamsHandling: 'merge', replaceUrl: true });
  }

  // ---- agregar y editar ----------------------------------------------------------------------------------------------------------------------

  startCreate(): void {
    this.form = { mode: 'create', kind: this.newKind, id: null, initial: {} };
  }

  startEdit(request: EditRequest): void {
    this.form = { mode: 'edit', kind: request.kind, id: request.id, initial: request.initial };
  }

  /** El formulario guardó: la lista se vuelve a pedir; un elemento nuevo se abre para vincularlo, y uno editado refresca su detalle. */
  onSaved(saved: unknown): void {
    const mode = this.form?.mode;
    this.form = null;
    this.toast.showSuccess(this.translate.instant(mode === 'create' ? 'CATALOG_MODULE.NOTICE.CREATED' : 'CATALOG_MODULE.NOTICE.UPDATED'));
    this.reload(this.page);
    const id = (saved as { id?: string } | null)?.id;
    if (mode === 'create' && id) this.show(this.detailKind, id);
    else this.detailPanel?.refresh();
  }

  reload(page: number): void {
    this.page = page;
    this.loading = true;
    this.failed = false;
    const token = ++this.request;
    const filters = this.filters();
    const call = this.comingSoon ? null : this.call(filters);
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
