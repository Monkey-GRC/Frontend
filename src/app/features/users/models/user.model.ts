export type Role = 'MONKEY_ADMIN' | 'CLIENT_ADMIN' | 'USER' | 'VIEWER';

export interface ClientSummary {
    id: string;
    name: string;
    tax_id: string;
}

export interface User {
    id: string;
    email: string;
    username: string;
    name?: string;
    last_name?: string;
    role: Role;
    client_id: string | null;
    client: ClientSummary | null;
    is_active: boolean;
    created_at?: Date;
    updated_at?: Date;
}

export interface CreateUser {
    email: string;
    username: string;
    password: string;
    name?: string;
    last_name?: string;
    role: Role;
    client_id?: string;
}

export interface UpdateUser extends Partial<Omit<CreateUser, 'password' | 'client_id'>> {
    password?: string;
    client_id?: string | null;
    is_active?: boolean;
}
