import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { environment } from '@environments/environment';
import { CreateTemplate, Template, UpdateTemplate } from '@features/grc-framework/models/template.model';
import { ApiResponse } from '@shared/models/api-response.model';

@Injectable({
  providedIn: 'root'
})
export class TemplateService {

  apiUrl = environment.apiUrl + '/templates';
  form!: FormGroup;
  templates: Template[] = [];
  selectedTemplate: Template | null = {} as Template;

  constructor(
    private http: HttpClient,
    private fb: FormBuilder
  ) { }

  initializeForm(data?: Template) {
    this.form = this.fb.group({
      name: [data?.name, [Validators.required]],
      slug: [data?.slug, [Validators.required, Validators.pattern(/^[a-z0-9-]+$/)]],
      description: [data?.description],
      objective: [data?.objective],
      scope: [data?.scope],
    })
  }

  createTemplate(body: CreateTemplate) {
    return this.http.post<ApiResponse>(`${this.apiUrl}`, body);
  }

  updateTemplate(id: string, body: UpdateTemplate) {
    return this.http.patch<ApiResponse>(`${this.apiUrl}/${id}`, body);
  }

  deleteTemplate(id: string) {
    return this.http.delete<ApiResponse>(`${this.apiUrl}/${id}`);
  }

  readAllTemplate() {
    return this.http.get<ApiResponse>(`${this.apiUrl}`);
  }

  readTemplate(id: string) {
    return this.http.get<ApiResponse<Template>>(`${this.apiUrl}/${id}`);
  }

}
