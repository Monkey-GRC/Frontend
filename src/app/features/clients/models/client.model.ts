export type ProvisioningStatus = 'PENDING' | 'PROVISIONING' | 'READY' | 'FAILED';

export interface Client {
    id: string;
    tax_id: string;
    name: string;
    seq: number;
    is_active: boolean;
    api_key_id: string;
    provisioning_status: ProvisioningStatus;
    provisioned_at: string | null;
    created_at: string;
    updated_at: string;
}

export interface CreateClient {
    name: string;
    tax_id: string;
}

export interface CreateClientResult {
    client: Client;
    api_key: string;
}
