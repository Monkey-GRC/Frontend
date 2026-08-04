import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { environment } from '@environments/environment';
import { Client, CreateClient, CreateClientResult, DocumentType, RegenerateOnboardingCodeResult } from '@features/clients/models/client.model';
import { ApiResponse } from '@shared/models/api-response.model';

export const DOCUMENT_TYPES: { value: DocumentType; label: string }[] = [
  { value: 'NIT', label: 'NIT' },
  { value: 'RUC', label: 'RUC' },
  { value: 'CEDULA', label: 'Cédula' },
  { value: 'PASAPORTE', label: 'Pasaporte' },
  { value: 'OTRO', label: 'Otro' },
];

@Injectable({
  providedIn: 'root'
})
export class ClientService {

  apiUrl = environment.apiUrl + '/clients';
  form!: FormGroup;
  clients!: Client[];

  constructor(
    private http: HttpClient,
    private fb: FormBuilder
  ) { }

  initializeForm() {
    this.form = this.fb.group({
      name: [null, [Validators.required, Validators.maxLength(150)]],
      document_type: [null, [Validators.required]],
      document_number: [null, [Validators.required, Validators.maxLength(50)]],
      email: [null, [Validators.required, Validators.email]],
      phone: [null, [Validators.required, Validators.maxLength(30)]],
      address: [null, [Validators.required, Validators.maxLength(255)]],
    });
  }

  createClient(body: CreateClient) {
    return this.http.post<ApiResponse<CreateClientResult>>(`${this.apiUrl}`, body);
  }

  readAllClients() {
    return this.http.get<ApiResponse<Client[]>>(`${this.apiUrl}`);
  }

  readClient(id: string) {
    return this.http.get<ApiResponse<Client>>(`${this.apiUrl}/${id}`);
  }

  regenerateOnboardingCode(id: string) {
    return this.http.post<ApiResponse<RegenerateOnboardingCodeResult>>(`${this.apiUrl}/${id}/onboarding-code/regenerate`, {});
  }

  deactivateClient(id: string) {
    return this.http.patch<ApiResponse<Client>>(`${this.apiUrl}/${id}/deactivate`, {});
  }

  reactivateClient(id: string) {
    return this.http.patch<ApiResponse<Client>>(`${this.apiUrl}/${id}/reactivate`, {});
  }

}
