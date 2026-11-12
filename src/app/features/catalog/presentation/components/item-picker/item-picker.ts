import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, input, output, inject } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { Observable, Subject, Subscription, debounceTime, distinctUntilChanged, map } from 'rxjs';
import { CatalogFramework, FrameworkDetail, Paginated } from '@features/catalog/models/catalog.model';
import { CatalogService } from '@features/catalog/services/catalog.service';
import { DataTable, TableCell, TableColumn } from '@shared/presentation/components/data-table/data-table';
import { SearchField } from '@shared/presentation/components/search-field/search-field';
import { Select, SelectOption } from '@shared/presentation/components/select/select';
import { targetValue } from '@shared/presentation/utils/event-target';

export type PickKind = 'test' | 'template' | 'cause' | 'control' | 'risk' | 'pof';

export interface Pick {
  /** El id con el que se vincula. */
  id: string;
  label: string;
}

interface Choice extends Pick {
  hint: string;
  /** Con qué se compara la lista de excluidos: el id, o `REQ#N` para un punto de enfoque. */
  key: string;
}

// Elegir con qué se vincula un elemento del catálogo: busca entre los activos (por código o nombre) y deja fuera lo que ya está vinculado. Los puntos de enfoque se eligen
// por marco y requisito, porque son 302 y no se buscan por texto.
@Component({
  selector: 'app-item-picker',
  imports: [TranslateModule, DataTable, TableCell, Select, SearchField],
  templateUrl: './item-picker.html',
  changeDetection: ChangeDetectionStrategy.Default,
})
export class ItemPicker implements OnInit, OnDestroy {
  private readonly catalog = inject(CatalogService);

  protected readonly targetValue = targetValue;
  readonly kind = input.required<PickKind>();
  /** Lo que ya está vinculado (ids; `REQ#N` en los puntos de enfoque): no se ofrece de nuevo. */
  readonly exclude = input<string[]>([]);
  /** Al elegir una prueba: solo las de estas dimensiones (las que el control tiene). */
  readonly onlyDimensions = input<string[] | null>(null);

  readonly picked = output<Pick>();
  readonly cancelled = output<void>();

  query = '';
  // Las opciones en la lista compacta (la tabla única en su variante para paneles): el código y lo que lo explica; pulsar la fila elige.
  readonly columns: TableColumn<Choice>[] = [
    { key: 'label', headerKey: 'CATALOG_MODULE.PICKER.CAPTION', class: 'w-32' },
    { key: 'hint', headerKey: 'CATALOG_MODULE.PICKER.CAPTION' },
  ];
  readonly choiceKey = (c: Choice) => c.key;
  readonly choiceLabel = (c: Choice) => c.label;
  choices: Choice[] = [];
  loading = false;
  failed = false;

  frameworks: CatalogFramework[] = [];
  frameworkOptions: SelectOption[] = [];
  requirementOptions: SelectOption[] = [];
  frameworkId = '';
  framework: FrameworkDetail | null = null;
  requirementCode = '';

  private readonly typing = new Subject<string>();
  private subscription?: Subscription;
  private request = 0;

  ngOnInit(): void {
    if (this.kind() === 'pof') {
      this.loading = true;
      this.catalog.frameworks().subscribe({
        next: (list) => {
          this.frameworks = list;
          this.frameworkOptions = list.map((f) => ({ value: f.id, label: f.name }));
          this.loading = false;
          const first = list.find((f) => f.availability === 'available') ?? list[0];
          if (first) this.pickFramework(first.id);
        },
        error: () => this.fail(),
      });
      return;
    }
    this.subscription = this.typing.pipe(debounceTime(300), distinctUntilChanged()).subscribe((text) => {
      this.query = text;
      this.search();
    });
    this.search();
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  onType(text: string): void {
    this.typing.next(text.trim());
  }

  pickFramework(id: string): void {
    this.frameworkId = id;
    this.requirementCode = '';
    this.requirementOptions = [];
    this.choices = [];
    this.catalog.framework(id).subscribe({
      next: (framework) => {
        this.framework = framework;
        this.requirementOptions = framework.requirements.map((r) => ({ value: r.code, label: `${r.code} · ${r.criterion}` }));
      },
      error: () => this.fail(),
    });
  }

  pickRequirement(code: string): void {
    this.requirementCode = code;
    this.choices = [];
    if (!code) return;
    this.loading = true;
    this.failed = false;
    const token = ++this.request;
    this.catalog.pointsOfFocus(this.frameworkId, code).subscribe({
      next: (points) => {
        if (token !== this.request) return;
        this.choices = points
          .map((p) => ({ id: p.id, key: `${p.requirement_code}#${p.number}`, label: `${p.requirement_code}#${p.number}`, hint: p.description }))
          .filter((c) => !this.exclude().includes(c.key));
        this.loading = false;
      },
      error: () => this.fail(),
    });
  }

  choose(choice: Choice): void {
    this.picked.emit({ id: choice.id, label: choice.label });
  }

  search(): void {
    this.loading = true;
    this.failed = false;
    const token = ++this.request;
    const filters = { page: 1, search: this.query || undefined, is_active: true };
    const call = this.list(filters);
    call.subscribe({
      next: (choices) => {
        if (token !== this.request) return;
        this.choices = choices.filter((c) => !this.exclude().includes(c.key)).slice(0, 12);
        this.loading = false;
      },
      error: () => this.fail(),
    });
  }

  private list(filters: { page: number; search?: string; is_active: boolean }): Observable<Choice[]> {
    const wrap = <T>(page: Observable<Paginated<T>>, row: (r: T) => Choice) => page.pipe(map((p) => p.items.map(row)));
    switch (this.kind()) {
      case 'test':
        return wrap(this.catalog.tests(filters), (t) => ({ id: t.id, key: t.id, label: t.code, hint: `${t.display_name ?? t.name} · ${t.dimension}`, dimension: t.dimension } as Choice & { dimension: string })).pipe(
          map((rows) => {
            const only = this.onlyDimensions();
            return only ? rows.filter((r) => only.includes((r as Choice & { dimension: string }).dimension)) : rows;
          }),
        );
      case 'template':
        return wrap(this.catalog.evidenceTemplates(filters), (t) => ({ id: t.id, key: t.id, label: t.code, hint: t.description }));
      case 'cause':
        return wrap(this.catalog.causes(filters), (c) => ({ id: c.id, key: c.id, label: c.code, hint: c.name }));
      case 'control':
        return wrap(this.catalog.controls(filters), (c) => ({ id: c.id, key: c.id, label: c.code, hint: c.name }));
      default:
        return wrap(this.catalog.risks(filters), (r) => ({ id: r.id, key: r.id, label: r.code, hint: r.name }));
    }
  }

  private fail(): void {
    this.failed = true;
    this.loading = false;
  }
}
