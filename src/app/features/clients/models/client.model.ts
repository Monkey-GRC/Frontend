export type ProvisioningStatus = 'PENDING' | 'PROVISIONING' | 'READY' | 'FAILED';

export type DocumentType = 'NIT' | 'RUC' | 'CEDULA' | 'PASAPORTE' | 'OTRO';

export interface Client {
    id: string;
    name: string;
    document_type: DocumentType;
    document_number: string;
    email: string;
    phone: string;
    address: string;
    seq: number;
    is_active: boolean;
    client_identifier: string | null;
    provisioning_status: ProvisioningStatus;
    onboarding_code_expires_at: string | null;
    onboarding_completed_at: string | null;
    provisioned_at: string | null;
    created_at: string;
    updated_at: string;
}

export interface CreateClient {
    name: string;
    document_type: DocumentType;
    document_number: string;
    email: string;
    phone: string;
    address: string;
}

export interface CreateClientResult {
    client: Client;
    onboarding_code: string;
}

export interface RegenerateOnboardingCodeResult {
    client: Client;
    onboarding_code: string;
}
