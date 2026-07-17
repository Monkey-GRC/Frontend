import { User } from "@features/auth/models/user";
import { Control } from "@features/grc-framework/models/control.model";

export interface ReasonRiskSummary {
    id: string;
    name: string;
    code: string;
    level?: string;
}

export interface Reason {
    id: string;
    name: string;
    description?: string;
    code?: string;
    risks?: { risk: ReasonRiskSummary }[];
    controls?: { control: Control }[];
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
