import { User } from "@features/auth/models/user";

export type ControlType = 'MANUAL' | 'AUTOMATIC' | 'HYBRID';

export interface Control {
    id: string;
    name: string;
    description: string;
    objective: string;
    type: ControlType;
    code: string;
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
}

export interface UpdateControl extends Partial<CreateControl> {}
