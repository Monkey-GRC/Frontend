// contracts/modules/monkey-admin.md — empresas (tenants) y su clave de acceso.
export type IsolationStrategy = 'dedicated' | 'shared';
export type CompanyStatus = 'active' | 'suspended';
export type AccessKeyStatus = 'pending' | 'used' | 'expired' | 'revoked';

export interface Company {
    id: string;
    name: string;
    admin_email: string;
    isolation_strategy: IsolationStrategy;
    status: CompanyStatus;
    access_key_status: AccessKeyStatus | null;
    access_key_expires_at: string | null;
    onboarding_completed: boolean;
    created_at: string;
}

// Los 3 campos que fija el comité (modelo-datos.md §4.2).
export interface CreateCompany {
    name: string;
    requires_dedicated_database: boolean;
    admin_email: string;
}

// Respuesta del registro: única vez en que la clave viaja en claro.
export interface RegisteredCompany {
    id: string;
    name: string;
    admin_email: string;
    isolation_strategy: IsolationStrategy;
    status: CompanyStatus;
    created_at: string;
    updated_at: string;
    access_key: {
        id: string;
        code: string;
        status: AccessKeyStatus;
        expires_at: string;
    };
}

export interface Paginated<T> {
    items: T[];
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
}
