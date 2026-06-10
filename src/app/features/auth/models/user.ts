export interface User {
    id: string;
    email: string;
    name: string;
    last_name: string;
    username: string;
    seq?: number;
    role?: string;
    client_id?: null;
    is_active?: boolean;
    created_at?: Date;
    updated_at?: Date;
    created_by?: string;
    updated_by?: null;
    refresh_token_hash?: string;
    refresh_token_expires_at?: Date;
}

//Final test for github
