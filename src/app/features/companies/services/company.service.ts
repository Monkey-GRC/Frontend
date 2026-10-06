import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { environment } from '@environments/environment';
import {
  Company,
  CreateCompany,
  FrameworkOption,
  Paginated,
  RegisteredCompany,
} from '@features/companies/models/company.model';
import { SuccessResponse } from '@shared/models/api-response.model';

@Injectable({
  providedIn: 'root'
})
export class CompanyService {

  apiUrl = environment.apiUrl + '/companies';
  form!: FormGroup;
  companies: Company[] = [];
  page = 1;
  pageSize = 25;
  total = 0;
  totalPages = 0;

  constructor(
    private http: HttpClient,
    private fb: FormBuilder
  ) { }

  initializeForm() {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(255)]],
      admin_email: ['', [Validators.required, Validators.email, Validators.maxLength(254)]],
      requires_dedicated_database: [false],
    });
  }

  // Todos los marcos que Monkey ofrece; solo los `available` se pueden contratar (D50).
  readFrameworks() {
    return this.http.get<SuccessResponse<{ items: FrameworkOption[] }>>(
      `${environment.apiUrl}/catalogs/frameworks`,
    );
  }

  createCompany(body: CreateCompany) {
    return this.http.post<SuccessResponse<RegisteredCompany>>(this.apiUrl, body);
  }

  readCompanies(page = this.page) {
    const params = new HttpParams()
      .set('page', page)
      .set('page_size', this.pageSize)
      .set('sort', '-created_at');
    return this.http.get<SuccessResponse<Paginated<Company>>>(this.apiUrl, { params });
  }

}
