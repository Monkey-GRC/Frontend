// Los 4 roles del comité (modelo-datos.md §5.1). Monkey Admin solo admite admin_monkey.
export type UserRole = 'admin_monkey' | 'admin_empresa' | 'funcional' | 'auditor';

export interface User {
    id: string;
    email: string;
    name: string;
    last_name: string;
    role: UserRole;
    status: 'active' | 'inactive' | 'suspended';
    is_mfa_enabled: boolean;
    last_login_at: string | null;
    created_at: string;
}
