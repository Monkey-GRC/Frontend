import { User } from "@features/auth/models/user";
import { ChecklistCheck, ChecklistOS } from "@features/grc-framework/models/checklist.model";

export type ControlType = 'MANUAL' | 'AUTOMATIC' | 'HYBRID';

export interface ControlCheck {
    id: string;
    check_id: string;
    title: string;
    os: ChecklistOS;
    soc2_code?: string | null;
    cis_code?: string | null;
    pci_dss_code?: string | null;
}

export interface Control {
    id: string;
    name: string;
    description: string;
    objective: string;
    type: ControlType;
    code: string;
    checks?: ControlCheck[];
    created_by_user?: User;
    updated_by_user?: User;
    created_at?: Date;
    updated_at?: Date;
}

export interface CreateControl {
    name: string;
    description: string;
    objective: string;
    type: ControlType;
    os?: ChecklistOS;
    checklist?: ChecklistCheck[];
}

export interface UpdateControl extends Partial<CreateControl> {}
