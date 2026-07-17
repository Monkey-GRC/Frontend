import { User } from "@features/auth/models/user";

export interface RiskTemplateSummary {
    id: string;
    name: string;
    code: string;
}

export interface RiskReasonSummary {
    id: string;
    name: string;
    code: string;
}

export interface Risk {
    id: string;
    name: string;
    description: string;
    impact: number;
    probability: number;
    code?: string;
    templateId?: string;
    template?: RiskTemplateSummary | null;
    reasons?: { reason: RiskReasonSummary }[];
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
    templateId?: string;
}

export interface UpdateRisk extends Partial<Omit<CreateRisk, 'templateId'>> {
    templateId?: string | null;
}