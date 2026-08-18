import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { environment } from '@environments/environment';
import { CreateReason, Reason, UpdateReason } from '@features/grc-framework/models/reason.model';
import { ApiResponse } from '@shared/models/api-response.model';

@Injectable({
  providedIn: 'root'
})
export class ReasonService {

  apiUrl = environment.apiUrl + '/reasons';
  form!: FormGroup;
  reasons: Reason[] = [];
  selectedReason: Reason | null = {} as Reason;

  constructor(
    private http: HttpClient,
    private fb: FormBuilder
  ) { }

  initializeForm(data?: Reason) {
    this.form = this.fb.group({
      name: [data?.name, [Validators.required, Validators.maxLength(150)]],
      description: [data?.description, [Validators.maxLength(500)]],
    })
  }

  createReason(body: CreateReason) {
    return this.http.post<ApiResponse<Reason>>(`${this.apiUrl}`, body);
  }

  updateReason(id: string, body: UpdateReason) {
    return this.http.patch<ApiResponse>(`${this.apiUrl}/${id}`, body);
  }

  deleteReason(id: string) {
    return this.http.delete<ApiResponse>(`${this.apiUrl}/${id}`);
  }

  readAllReason() {
    return this.http.get<ApiResponse>(`${this.apiUrl}`);
  }

  readReason(id: string) {
    return this.http.get<ApiResponse<Reason>>(`${this.apiUrl}/${id}`);
  }

  linkRisks(reasonId: string, riskIds: string[]) {
    return this.http.post<ApiResponse>(`${this.apiUrl}/${reasonId}/risks`, { riskIds });
  }

  unlinkRisk(reasonId: string, riskId: string) {
    return this.http.delete<ApiResponse>(`${this.apiUrl}/${reasonId}/risks/${riskId}`);
  }

  linkControls(reasonId: string, controlIds: string[]) {
    return this.http.post<ApiResponse>(`${this.apiUrl}/${reasonId}/controls`, { controlIds });
  }

  unlinkControl(reasonId: string, controlId: string) {
    return this.http.delete<ApiResponse>(`${this.apiUrl}/${reasonId}/controls/${controlId}`);
  }

}
