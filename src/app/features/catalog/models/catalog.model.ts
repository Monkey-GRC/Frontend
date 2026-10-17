// contracts/modules/monkey-admin-catalog.md — el catálogo maestro visto desde Monkey Admin. Solo lectura por ahora.
// Los riesgos, las causas y las pruebas son un pool compartido por todos los marcos; solo los controles cuelgan de un marco (por sus requisitos).

export type CatalogOrigin = 'committee' | 'monkey_admin';
export type FrameworkAvailability = 'available' | 'coming_soon';

export interface Paginated<T> {
    items: T[];
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
}

export interface CatalogFramework {
    id: string;
    code: string;
    name: string;
    version: string;
    type: string;
    availability: FrameworkAvailability;
    scope_description: string;
    // `controls` son los vinculados a algún requisito del marco (en SOC 2, 118 de los 119: CPL-1 no cuelga de ninguno).
    counts: { requirements: number; controls: number; tests: number };
}

export interface CatalogItemRef {
    id: string;
    code: string;
    name: string;
}

interface Stamped {
    id: string;
    code: string;
    origin: CatalogOrigin;
    is_active: boolean;
}

export interface ControlRow extends Stamped {
    name: string;
    domain: string;
    dimensions: string[];
    tests_count: number;
    evidence_templates_count: number;
}

export interface ControlDetail extends Stamped {
    name: string;
    description: string;
    domain: string;
    source_ref: string | null;
    points_of_focus: { id: string; framework_code: string; requirement_code: string; number: number; description: string }[];
    dimensions: { dimension: string; type: string; requires_probe: boolean; requires_ai: boolean; requires_compliance_confirmation: boolean }[];
    tests: { id: string; code: string; dimension: string; display_name: string | null; is_active: boolean }[];
    evidence_templates: { id: string; code: string; description: string; sequence: number }[];
    policies: { name: string; requires_employee_acceptance: boolean }[];
    causes: CatalogItemRef[];
}

export interface RiskRow extends Stamped {
    name: string;
    trust_criterion: string;
    causes_count: number;
}

export interface RiskDetail extends Stamped {
    name: string;
    description: string;
    trust_criterion: string;
    potential_impact: unknown;
    causes: CatalogItemRef[];
}

export interface CauseRow extends Stamped {
    name: string;
    failure_category: string;
    risks_count: number;
    controls_count: number;
}

export interface CauseDetail extends Stamped {
    name: string;
    description: string;
    failure_category: string;
    risks: CatalogItemRef[];
    controls: CatalogItemRef[];
}

export interface TestRow extends Stamped {
    dimension: string;
    name: string;
    display_name: string | null;
    type: string;
    controls_count: number;
}

// Los textos del comité se ven aquí porque quien lee es `admin_monkey`; al cliente no salen nunca (D70).
export interface TestDetail extends Stamped {
    dimension: string;
    name: string;
    display_name: string | null;
    display_description: string | null;
    committee: Record<string, unknown>;
    controls: CatalogItemRef[];
}

export interface EvidenceTemplateRow extends Stamped {
    description: string;
    dimension: string;
    controls_count: number;
}

// Lo que se puede crear y editar desde Monkey Admin, y la ruta de cada cosa en la API (`/v1/catalog/<ruta>`).
export type FormKind = 'control' | 'risk' | 'cause' | 'template' | 'test';

/** Una opción de una lista que sirve el backend (`GET /v1/catalogs/{nombre}`): el valor del enum y su texto en el idioma de la sesión. */
export interface CatalogOption {
  value: string;
  label: string;
}

/** Las listas del backend que usa esta pantalla. */
export type OptionName = 'dimension' | 'control_type' | 'risk_criterion' | 'failure_category' | 'catalog_origin';
export const KIND_PATH: Record<FormKind, string> = { control: 'controls', risk: 'risks', cause: 'causes', template: 'evidence-templates', test: 'tests' };

// Un error de campo que el backend devuelve en un 422, ya con su mensaje traducido.
export interface FieldError {
    field: string;
    code: string;
    message: string;
}

// El error que entrega el interceptor: el mensaje, el estado HTTP, el código del backend y, si es un 422, sus errores por campo.
export interface ApiError extends Error {
    status?: number;
    code?: string;
    fields?: FieldError[];
}

export interface PointOfFocusRef {
    id: string;
    framework_code: string;
    requirement_code: string;
    number: number;
    description: string;
    controls_count: number;
}

export interface FrameworkDetail extends CatalogFramework {
    requirements: { code: string; tsc_category: string; criterion: string; trust_criterion: string; points_of_focus_count: number; controls_count: number }[];
}

export type CatalogTab = 'controls' | 'risks' | 'causes' | 'tests' | 'evidence-templates';
export type ControlScope = 'framework' | 'all' | 'unlinked';

export interface CatalogFilters {
    page: number;
    search?: string;
    origin?: CatalogOrigin;
    is_active?: boolean;
    // Controles
    framework_id?: string;
    unlinked?: boolean;
    has_evidence_template?: boolean;
    // Pruebas
    dimension?: string;
}
