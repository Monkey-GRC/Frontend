import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnChanges, SimpleChanges, input, output } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Observable } from 'rxjs';
import { ApiError, CauseDetail, ControlDetail, EvidenceTemplateRow, FormKind, RiskDetail, TestDetail } from '@features/catalog/models/catalog.model';
import { CatalogService } from '@features/catalog/services/catalog.service';
import { ItemPicker, Pick, PickKind } from '@features/catalog/presentation/components/item-picker/item-picker';
import { CONTROL_TYPES, DIMENSIONS } from '@features/catalog/presentation/components/catalog-form/catalog-form.config';

export type DetailKind = 'controls' | 'risks' | 'causes' | 'tests' | 'evidence-templates';
type Detail = ControlDetail | RiskDetail | CauseDetail | TestDetail | EvidenceTemplateRow;

/** Qué se está agregando al elemento abierto. Cada combinación elemento + espacio es un vínculo del catálogo. */
export type Slot = 'pof' | 'test' | 'template' | 'cause' | 'risk' | 'control';

const FORM_KIND: Record<DetailKind, FormKind> = { controls: 'control', risks: 'risk', causes: 'cause', tests: 'test', 'evidence-templates': 'template' };
const PICK_KIND: Record<Slot, PickKind> = { pof: 'pof', test: 'test', template: 'template', cause: 'cause', risk: 'risk', control: 'control' };

/** Lo que la vista necesita para abrir el formulario de edición con los valores actuales. */
export interface EditRequest {
  kind: FormKind;
  id: string;
  initial: Record<string, unknown>;
}

// El detalle de un elemento del catálogo, en un panel a la derecha. Pide el elemento al abrirse y cuando cambia el que se muestra. Desde aquí se edita, se da de baja o se
// reactiva, y se vincula o desvincula con lo relacionado (contracts/modules/monkey-admin-catalog.md). Dar de baja no borra; desvincular borra solo la relación.
@Component({
  selector: 'app-catalog-detail',
  imports: [CommonModule, TranslateModule, ItemPicker],
  templateUrl: './catalog-detail.html',
  changeDetection: ChangeDetectionStrategy.Default,
})
export class CatalogDetail implements OnChanges {
  readonly kind = input.required<DetailKind>();
  readonly itemId = input.required<string>();
  readonly closed = output<void>();
  /** Algo cambió (se editó, se dio de baja o se vinculó): la lista de atrás se vuelve a pedir. */
  readonly changed = output<void>();
  readonly editRequested = output<EditRequest>();

  readonly dimensions = DIMENSIONS;
  readonly controlTypes = CONTROL_TYPES;

  detail: Detail | null = null;
  loading = true;
  failed = false;

  slot: Slot | null = null;
  sequence = '';
  addingDimension = false;
  dimension = { dimension: 'policy', type: 'manual', requires_probe: false, requires_ai: false, requires_compliance_confirmation: false };
  confirmingDeactivate = false;
  busy = false;
  error: string | null = null;

  constructor(
    private readonly catalog: CatalogService,
    private readonly translate: TranslateService,
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['kind'] || changes['itemId']) {
      this.resetEditing();
      this.load();
    }
  }

  load(): void {
    this.loading = this.detail === null;
    this.failed = false;
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

  /** Vuelve a pedir el elemento (lo llama la vista cuando el formulario guardó un cambio). */
  refresh(): void {
    this.load();
  }

  // ---- editar y dar de baja -------------------------------------------------------------------------------------------------------------------

  edit(): void {
    if (!this.detail) return;
    const d = this.detail as unknown as Record<string, unknown>;
    const committee = (d['committee'] ?? {}) as Record<string, unknown>;
    this.editRequested.emit({ kind: FORM_KIND[this.kind()], id: this.itemId(), initial: { ...d, ...committee } });
  }

  askDeactivate(): void {
    this.error = null;
    this.confirmingDeactivate = true;
  }

  deactivate(): void {
    this.run(this.catalog.deactivate(FORM_KIND[this.kind()], this.itemId()));
  }

  reactivate(): void {
    this.run(this.catalog.reactivate(FORM_KIND[this.kind()], this.itemId()));
  }

  // ---- vincular -------------------------------------------------------------------------------------------------------------------------------

  startPick(slot: Slot): void {
    this.resetEditing();
    this.slot = slot;
  }

  cancelPick(): void {
    this.slot = null;
    this.sequence = '';
  }

  pickKind(): PickKind {
    return PICK_KIND[this.slot as Slot];
  }

  /** Lo que ya está vinculado en el espacio abierto: el selector no lo ofrece de nuevo. */
  excluded(): string[] {
    const d = this.detail as unknown as Record<string, { id: string; code?: string; requirement_code?: string; number?: number }[]>;
    switch (this.slot) {
      case 'pof':
        return d['points_of_focus'].map((p) => `${p.requirement_code}#${p.number}`);
      case 'test':
        return d['tests'].map((t) => t.id);
      case 'template':
        return d['evidence_templates'].map((e) => e.id);
      case 'cause':
        return d['causes'].map((c) => c.id);
      case 'risk':
        return d['risks'].map((r) => r.id);
      case 'control':
        return d['controls'].map((c) => c.id);
      default:
        return [];
    }
  }

  /** Una prueba solo se vincula a un control que tenga su dimensión: se ofrecen únicamente las de las dimensiones del control. */
  controlDimensions(): string[] | null {
    return this.kind() === 'controls' ? (this.detail as ControlDetail).dimensions.map((d) => d.dimension) : null;
  }

  onPicked(pick: Pick): void {
    const id = this.itemId();
    const kind = this.kind();
    const slot = this.slot;
    let call: Observable<unknown> | null = null;
    if (kind === 'controls' && slot === 'pof') call = this.catalog.link('control', id, 'points-of-focus', { point_of_focus_id: pick.id });
    else if (kind === 'controls' && slot === 'test') call = this.catalog.link('control', id, 'tests', { test_id: pick.id });
    else if (kind === 'controls' && slot === 'template') {
      const position = Number(this.sequence);
      call = this.catalog.link('control', id, 'evidence-templates', { evidence_template_id: pick.id, ...(Number.isInteger(position) && position > 0 ? { sequence: position } : {}) });
    } else if (kind === 'controls' && slot === 'cause') call = this.catalog.link('cause', pick.id, 'controls', { control_id: id });
    else if (kind === 'risks' && slot === 'cause') call = this.catalog.link('risk', id, 'causes', { cause_id: pick.id });
    else if (kind === 'causes' && slot === 'risk') call = this.catalog.link('risk', pick.id, 'causes', { cause_id: id });
    else if (kind === 'causes' && slot === 'control') call = this.catalog.link('cause', id, 'controls', { control_id: pick.id });
    if (call) this.run(call);
  }

  /** Quita un vínculo. `childId` es el id del otro lado (o la dimensión). */
  unlinkFrom(slot: Slot | 'dimension', childId: string): void {
    const id = this.itemId();
    const kind = this.kind();
    let call: Observable<unknown> | null = null;
    if (kind === 'controls' && slot === 'pof') call = this.catalog.unlink('control', id, 'points-of-focus', childId);
    else if (kind === 'controls' && slot === 'test') call = this.catalog.unlink('control', id, 'tests', childId);
    else if (kind === 'controls' && slot === 'template') call = this.catalog.unlink('control', id, 'evidence-templates', childId);
    else if (kind === 'controls' && slot === 'dimension') call = this.catalog.unlink('control', id, 'dimensions', childId);
    else if (kind === 'controls' && slot === 'cause') call = this.catalog.unlink('cause', childId, 'controls', id);
    else if (kind === 'risks' && slot === 'cause') call = this.catalog.unlink('risk', id, 'causes', childId);
    else if (kind === 'causes' && slot === 'risk') call = this.catalog.unlink('risk', childId, 'causes', id);
    else if (kind === 'causes' && slot === 'control') call = this.catalog.unlink('cause', id, 'controls', childId);
    if (call) this.run(call);
  }

  saveDimension(): void {
    this.run(this.catalog.link('control', this.itemId(), 'dimensions', { ...this.dimension }));
  }

  // ---- internos -------------------------------------------------------------------------------------------------------------------------------

  /** Hace el cambio y, si sale bien, vuelve a pedir el elemento y avisa a la lista. Si no, muestra el mensaje del backend (un 409, por ejemplo). */
  private run(call: Observable<unknown>): void {
    this.busy = true;
    this.error = null;
    call.subscribe({
      next: () => {
        this.busy = false;
        this.resetEditing();
        this.load();
        this.changed.emit();
      },
      error: (e: ApiError) => {
        this.busy = false;
        this.confirmingDeactivate = false;
        this.error = e.fields?.[0]?.message ?? e.message;
      },
    });
  }

  private resetEditing(): void {
    this.slot = null;
    this.sequence = '';
    this.addingDimension = false;
    this.confirmingDeactivate = false;
    this.error = null;
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
      case 'evidence-templates':
        return this.catalog.evidenceTemplate(id);
    }
  }
}
