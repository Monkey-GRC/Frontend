export interface TemplateRiskSummary {
    id: string;
    name: string;
    code: string;
    level?: string;
}

export interface Template {
    id: string;
    name: string;
    slug: string;
    code: string;
    description?: string;
    objective?: string;
    scope?: string;
    risks?: TemplateRiskSummary[];
    created_at?: Date;
    updated_at?: Date;
}

export interface CreateTemplate {
    name: string;
    slug: string;
    description?: string;
    objective?: string;
    scope?: string;
}

export interface UpdateTemplate extends Partial<CreateTemplate> {}
