import { FormKind, OptionName } from '@features/catalog/models/catalog.model';

// Los campos de cada formulario del catálogo (contracts/modules/monkey-admin-catalog.md). El texto de cada etiqueta sale de `CATALOG_MODULE.FORM.FIELD.<CLAVE>`.
// `lines`: un texto por línea que viaja como lista. `committee`: textos internos del comité, opcionales, en una sección aparte (nunca los ve el cliente, D70).
export interface FieldDef {
    key: string;
    control: 'text' | 'textarea' | 'select' | 'lines';
    required?: boolean;
    /** Solo al crear: un código o una dimensión no se cambian después. */
    onlyOnCreate?: boolean;
    /** La lista del backend (`GET /v1/catalogs/{nombre}`) de la que salen las opciones de un `select`. */
    optionsCatalog?: OptionName;
    group?: 'main' | 'committee';
    /** Valor con el que arranca un formulario nuevo. */
    initial?: string;
}

/** Un código del catálogo: sin espacios, empieza por letra o número. El backend aplica la misma regla. */
export const CODE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,39}$/;

const COMMITTEE: FieldDef[] = [
    { key: 'tool', control: 'text', group: 'committee' },
    { key: 'population', control: 'textarea', group: 'committee' },
    { key: 'period', control: 'text', group: 'committee' },
    { key: 'population_size', control: 'text', group: 'committee' },
    { key: 'suggested_sample_size', control: 'text', group: 'committee' },
    { key: 'selection_method', control: 'text', group: 'committee' },
    { key: 'evidence_to_request', control: 'textarea', group: 'committee' },
    { key: 'prerequisites', control: 'textarea', group: 'committee' },
    { key: 'step_by_step', control: 'lines', group: 'committee' },
    { key: 'attributes_to_validate', control: 'lines', group: 'committee' },
    { key: 'compliance_criterion', control: 'textarea', group: 'committee' },
    { key: 'exceptions', control: 'textarea', group: 'committee' },
    { key: 'exceptions_handling', control: 'textarea', group: 'committee' },
    { key: 'evidence_to_retain', control: 'textarea', group: 'committee' },
    { key: 'automated_coverage', control: 'text', group: 'committee' },
    { key: 'complementary_manual_validation', control: 'textarea', group: 'committee' },
    { key: 'limitations', control: 'textarea', group: 'committee' },
];

export const FORM_FIELDS: Record<FormKind, FieldDef[]> = {
    control: [
        { key: 'code', control: 'text', required: true, onlyOnCreate: true },
        { key: 'name', control: 'text', required: true },
        { key: 'description', control: 'textarea', required: true },
        { key: 'domain', control: 'text', required: true },
        { key: 'source_ref', control: 'text' },
    ],
    risk: [
        // Sin código, el servidor asigna el siguiente libre (R0NN).
        { key: 'code', control: 'text', onlyOnCreate: true },
        { key: 'name', control: 'text', required: true },
        { key: 'description', control: 'textarea', required: true },
        { key: 'trust_criterion', control: 'select', required: true, optionsCatalog: 'risk_criterion' },
        { key: 'potential_impact', control: 'lines', required: true },
    ],
    cause: [
        { key: 'code', control: 'text', onlyOnCreate: true },
        { key: 'name', control: 'text', required: true },
        { key: 'description', control: 'textarea', required: true },
        { key: 'failure_category', control: 'select', required: true, optionsCatalog: 'failure_category' },
    ],
    template: [
        { key: 'code', control: 'text', required: true, onlyOnCreate: true },
        { key: 'description', control: 'textarea', required: true },
        { key: 'dimension', control: 'select', onlyOnCreate: true, optionsCatalog: 'dimension', initial: 'policy' },
    ],
    test: [
        { key: 'code', control: 'text', required: true, onlyOnCreate: true },
        { key: 'dimension', control: 'select', required: true, onlyOnCreate: true, optionsCatalog: 'dimension', initial: 'policy' },
        { key: 'name', control: 'text', required: true },
        { key: 'display_name', control: 'text', required: true },
        { key: 'display_description', control: 'textarea', required: true },
        { key: 'objective', control: 'textarea', required: true },
        { key: 'type', control: 'text', required: true },
        ...COMMITTEE,
    ],
};
