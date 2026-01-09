import { User } from "@features/auth/models/user";

export interface Risk {
    id: string;
    name: string;
    description: string;
    impact: number;
    probability: number;
    code?: string;
    created_by_user?: User;
    updated_by_user?: User;
    level?: string;
    created_at?: Date;
    updated_at?: Date;
}

export interface CreateRisk {
    name: string;
    description: string;
    impact: number;
    probability: number;
}

export interface UpdateRisk extends Partial<CreateRisk> {}