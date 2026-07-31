import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { environment } from '@environments/environment';
import { Client, CreateClient, CreateClientResult } from '@features/clients/models/client.model';
import { ApiResponse } from '@shared/models/api-response.model';

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
      tax_id: [null, [Validators.required, Validators.maxLength(50)]],
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

}
