import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { environment } from '@environments/environment';
import { ChecklistCheck } from '@features/grc-framework/models/checklist.model';
import { Control, ControlCheck, CreateControl, UpdateControl } from '@features/grc-framework/models/control.model';
import { ApiResponse } from '@shared/models/api-response.model';

@Injectable({
  providedIn: 'root'
})
export class ControlService {

  apiUrl = environment.apiUrl + '/controls';
  form!: FormGroup;
  controls!: Control[];
  selectedControl: Control | null = {} as Control;

  constructor(
    private http: HttpClient,
    private fb: FormBuilder
  ) { }

  initializeForm(data?: Control) {
    this.form = this.fb.group({
      name: [data?.name, [Validators.required]],
      description: [data?.description, [Validators.required]],
      objective: [data?.objective, [Validators.required]],
      type: [data?.type ?? 'MANUAL', [Validators.required]],
      os: [data?.checks?.[0]?.os ?? null],
      checklist: [this.mapChecksToChecklist(data?.checks)],
    })
  }

  private mapChecksToChecklist(checks?: ControlCheck[]): ChecklistCheck[] {
    return checks?.map(c => ({ checkId: c.check_id, title: c.title })) ?? [];
  }

  createControl(body: CreateControl) {
    return this.http.post<ApiResponse>(`${this.apiUrl}`, body);
  }

  updateControl(id: string, body: UpdateControl) {
    return this.http.patch<ApiResponse>(`${this.apiUrl}/${id}`, body);
  }

  deleteControl(id: string) {
    return this.http.delete<ApiResponse>(`${this.apiUrl}/${id}`);
  }

  readAllControl() {
    return this.http.get<ApiResponse>(`${this.apiUrl}`);
  }

}
