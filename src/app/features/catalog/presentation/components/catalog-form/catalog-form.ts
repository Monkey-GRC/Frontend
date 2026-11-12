import { ChangeDetectionStrategy, Component, OnInit, input, output, inject } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ApiError, CatalogOption, FormKind } from '@features/catalog/models/catalog.model';
import { CatalogOptionsService } from '@features/catalog/services/catalog-options.service';
import { CatalogService } from '@features/catalog/services/catalog.service';
import { FormModal } from '@shared/presentation/components/form-modal/form-modal';
import { CODE_PATTERN, FORM_FIELDS, FieldDef } from './catalog-form.config';
import { targetValue } from '@shared/presentation/utils/event-target';
import { Select } from '@shared/presentation/components/select/select';

type Values = Record<string, string>;

// El formulario para agregar o editar un elemento del catálogo (contracts/modules/monkey-admin-catalog.md). Es el mismo para los cinco tipos: lo que cambia son sus campos
// (`catalog-form.config.ts`). Al editar solo se manda lo que cambió. El backend es quien manda: sus errores por campo se muestran junto a cada campo.
@Component({
  selector: 'app-catalog-form',
  imports: [TranslateModule, FormModal, Select],
  templateUrl: './catalog-form.html',
  changeDetection: ChangeDetectionStrategy.Default,
})
export class CatalogForm implements OnInit {
  private readonly catalog = inject(CatalogService);
  private readonly options = inject(CatalogOptionsService);
  private readonly translate = inject(TranslateService);

  protected readonly targetValue = targetValue;
  readonly kind = input.required<FormKind>();
  readonly mode = input.required<'create' | 'edit'>();
  /** Al editar: el id del elemento y sus valores actuales (tal como los devuelve el detalle). */
  readonly itemId = input<string | null>(null);
  readonly initial = input<Record<string, unknown>>({});

  /** Se guardó: el elemento ya actualizado. */
  readonly saved = output<unknown>();
  readonly cancelled = output<void>();

  values: Values = {};
  private original: Values = {};
  errors: Record<string, string> = {};
  banner: string | null = null;
  sending = false;
  committeeOpen = false;

  ngOnInit(): void {
    for (const field of this.fields) {
      const raw = this.initial()[field.key];
      this.values[field.key] = this.mode() === 'edit' ? this.show(raw) : (field.initial ?? '');
    }
    this.original = { ...this.values };
    // Las opciones de los selects salen del backend; el formulario se pinta ya y los selects se llenan cuando llegan.
    this.options.load(this.fields.flatMap((f) => (f.optionsCatalog ? [f.optionsCatalog] : []))).subscribe();
  }

  optionsOf(field: FieldDef): CatalogOption[] {
    return field.optionsCatalog ? this.options.options(field.optionsCatalog) : [];
  }

  get fields(): FieldDef[] {
    return FORM_FIELDS[this.kind()].filter((f) => this.mode() === 'create' || !f.onlyOnCreate);
  }

  get mainFields(): FieldDef[] {
    return this.fields.filter((f) => f.group !== 'committee');
  }

  get committeeFields(): FieldDef[] {
    return this.fields.filter((f) => f.group === 'committee');
  }

  set(key: string, value: string): void {
    this.values[key] = value;
    delete this.errors[key];
  }

  /** Al editar, solo se puede guardar si algo cambió. */
  get changed(): boolean {
    return this.fields.some((f) => this.values[f.key] !== this.original[f.key]);
  }

  save(): void {
    this.banner = null;
    this.errors = {};
    const body = this.body();
    if (!body || this.sending) return;
    this.sending = true;
    const call = this.mode() === 'create' ? this.catalog.create(this.kind(), body) : this.catalog.update(this.kind(), this.itemId() as string, body);
    call.subscribe({
      next: (saved) => {
        this.sending = false;
        this.saved.emit(saved);
      },
      error: (e: ApiError) => {
        this.sending = false;
        for (const field of e.fields ?? []) this.errors[field.field] = field.message;
        // Sin errores por campo (un 409, por ejemplo) el mensaje del backend va en un aviso general.
        if (!e.fields?.length) this.banner = e.message;
        else if (this.committeeFields.some((f) => this.errors[f.key])) this.committeeOpen = true;
      },
    });
  }

  /** El cuerpo a enviar, o `null` si falta algo (los errores quedan junto a cada campo). */
  private body(): Record<string, unknown> | null {
    const body: Record<string, unknown> = {};
    for (const field of this.fields) {
      const value = (this.values[field.key] ?? '').trim();
      if (field.required && !value) this.errors[field.key] = this.translate.instant('CATALOG_MODULE.FORM.REQUIRED');
      else if (field.key === 'code' && value && !CODE_PATTERN.test(value)) this.errors[field.key] = this.translate.instant('CATALOG_MODULE.FORM.CODE_INVALID');
      if (this.mode() === 'edit' && this.values[field.key] === this.original[field.key]) continue;
      if (field.control === 'lines') {
        const lines = this.lines(this.values[field.key]);
        if (lines.length || this.mode() === 'edit') body[field.key] = lines;
      } else if (value || (this.mode() === 'edit' && this.original[field.key])) {
        body[field.key] = value;
      }
    }
    if (Object.keys(this.errors).length) {
      if (this.committeeFields.some((f) => this.errors[f.key])) this.committeeOpen = true;
      return null;
    }
    return body;
  }

  private lines(text: string | undefined): string[] {
    return (text ?? '').split('\n').map((l) => l.trim()).filter(Boolean);
  }

  /** Un valor del detalle como texto de formulario: las listas, una por línea. */
  private show(value: unknown): string {
    if (Array.isArray(value)) return value.map((v) => (typeof v === 'string' ? v : JSON.stringify(v))).join('\n');
    return value === null || value === undefined ? '' : String(value);
  }
}
