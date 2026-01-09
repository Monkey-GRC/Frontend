import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { environment } from '@environments/environment';
import { CreateRisk, Risk, UpdateRisk } from '@features/grc-framework/models/risk.model';
import { ApiResponse } from '@shared/models/api-response.model';

@Injectable({
  providedIn: 'root'
})
export class RiskService {

  apiUrl = environment.apiUrl + '/risks';
  form!: FormGroup;
  risks!: Risk[];
  selectedRisk: Risk | null = {} as Risk;

  constructor(
    private http: HttpClient,
    private fb: FormBuilder
  ) { }


  initializeForm(data?: Risk) {
    this.form = this.fb.group({
      name: [data?.name, [Validators.required]],
      description: [data?.description, [Validators.required]],
      probability: [data?.probability, [Validators.required]],
      impact: [data?.impact, [Validators.required]],
    })
  }

  createRisk(body: CreateRisk) {
    return this.http.post<ApiResponse>(`${this.apiUrl}`, body)
  }

  updateRisk(id: string, body: UpdateRisk) {
    return this.http.patch<ApiResponse>(`${this.apiUrl}/${id}`, body)
  }

  deleteRisk(id: string) {
    return this.http.delete<ApiResponse>(`${this.apiUrl}/${id}`)
  }

  readAllRisk() {
    return this.http.get<ApiResponse>(`${this.apiUrl}`)
  }

}
