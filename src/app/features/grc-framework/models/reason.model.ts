import { User } from "@features/auth/models/user";

export interface Reason {
    id: string;
    name: string;
    description?: string;
    code?: string;
    created_by_user?: User;
    updated_by_user?: User;
    created_at?: Date;
    updated_at?: Date;
}

export interface CreateReason {
    name: string;
    description?: string;
}

export interface UpdateReason extends Partial<CreateReason> {}
