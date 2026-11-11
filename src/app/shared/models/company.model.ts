// contracts/modules/monkey-admin.md — empresas (tenants) y su clave de acceso.
export type IsolationStrategy = 'dedicated' | 'shared';
export type CompanyStatus = 'active' | 'suspended' | 'deactivated';
// D97: por qué se archiva una empresa (contracts/enums.md).
export type DeactivationReason = 'non_payment' | 'client_request' | 'other';
export const DEACTIVATION_REASONS: DeactivationReason[] = ['non_payment', 'client_request', 'other'];
// Plazo por defecto hasta el borrado definitivo (6 meses) y el mínimo que acepta el backend (D97).
export const DEFAULT_RETENTION_DAYS = 180;
export const MIN_RETENTION_DAYS = 7;
export type AccessKeyStatus = 'pending' | 'used' | 'expired' | 'revoked';

// Un marco que se contrata para la empresa (D47). Hoy solo SOC 2.
export interface ContractedFramework {
    code: string;
    name: string;
    contracted_at: string;
}

// Un marco que Monkey ofrece (GET /v1/catalogs/frameworks). `available` = ya tiene catálogo y se puede
// contratar (hoy solo SOC 2); `coming_soon` = oferta comercial, se muestra pero no se puede elegir (D50).
export type FrameworkAvailability = 'available' | 'coming_soon';

export interface FrameworkOption {
    code: string;
    name: string;
    description: string;
    label: string;
    availability: FrameworkAvailability;
}

export interface Company {
    id: string;
    name: string;
    admin_email: string;
    isolation_strategy: IsolationStrategy;
    status: CompanyStatus;
    frameworks: ContractedFramework[];
    access_key_status: AccessKeyStatus | null;
    access_key_expires_at: string | null;
    onboarding_completed: boolean;
    created_at: string;
    // D103 · El cupo de usuarios contratado y cuántas cuentas cuentan hoy (activas, pendientes y suspendidas, de cualquier rol; las inactivas no).
    // `max_users` nulo = empresa anterior al cupo, sin tope.
    max_users: number | null;
    users_count: number;
    // D97: solo una empresa archivada trae estos campos.
    deactivated_at: string | null;
    archive_until: string | null;
    deactivation_reason_code: DeactivationReason | null;
    deactivation_reason: string | null;
}

// Los 3 campos que fija el comité (modelo-datos.md §4.2) y el marco que se contrata (D47).
export interface CreateCompany {
    name: string;
    requires_dedicated_database: boolean;
    admin_email: string;
    framework_codes: string[];
    // D103 · Usuarios contratados: obligatorio, entero ≥ 1.
    max_users: number;
}

// D103 · El cupo menor que las cuentas que ya cuentan responde 409 MAX_USERS_BELOW_CURRENT con estos dos números.
export const MAX_USERS_BELOW_CURRENT = 'MAX_USERS_BELOW_CURRENT';
export interface MaxUsersBelowCurrent {
    max_users: number;
    users_count: number;
}

// D99 · `sent`: el servicio de correo aceptó el mensaje (no garantiza que llegue). `failed`: no salió; se reenvía.
export type AccessKeyDeliveryStatus = 'sent' | 'failed';

// La clave emitida al registrar o reenviar. Nunca lleva el código: viaja por correo al administrativo (D99).
export interface IssuedAccessKey {
    id: string;
    status: AccessKeyStatus;
    expires_at: string;
    delivery_status: AccessKeyDeliveryStatus;
}

// Respuesta del registro: la clave salió por correo, no viaja aquí.
export interface RegisteredCompany {
    id: string;
    name: string;
    admin_email: string;
    isolation_strategy: IsolationStrategy;
    status: CompanyStatus;
    frameworks: ContractedFramework[];
    max_users?: number | null;
    users_count?: number;
    created_at: string;
    updated_at: string;
    access_key: IssuedAccessKey;
}

export interface Paginated<T> {
    items: T[];
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
}

// POST /v1/companies/{id}/deactivation (D97)
export interface ArchiveCompany {
    confirm_name: string;
    reason_code: DeactivationReason;
    reason: string;
    retention_days: number;
    totp_code: string;
}

// POST /v1/companies/{id}/reactivation (D97)
export interface ReactivateCompany {
    reason: string;
    totp_code: string;
}
