import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { environment } from '@environments/environment';
import {
  ArchiveCompany,
  Company,
  CompanyStatus,
  CreateCompany,
  FrameworkOption,
  IssuedAccessKey,
  Paginated,
  ReactivateCompany,
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
  // D97: las archivadas salen del listado por defecto; con este filtro se ven solo ellas.
  statusFilter: Extract<CompanyStatus, 'deactivated'> | null = null;

  constructor(
    private http: HttpClient,
    private fb: FormBuilder
  ) { }

  initializeForm() {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(255)]],
      admin_email: ['', [Validators.required, Validators.email, Validators.maxLength(254)]],
      requires_dedicated_database: [false],
      // D103 · Usuarios contratados: obligatorio, entero ≥ 1.
      max_users: [null as number | null, [Validators.required, Validators.min(1), Validators.pattern(/^\d+$/)]],
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
    let params = new HttpParams()
      .set('page', page)
      .set('page_size', this.pageSize)
      .set('sort', '-created_at');
    if (this.statusFilter) params = params.set('status', this.statusFilter);
    return this.http.get<SuccessResponse<Paginated<Company>>>(this.apiUrl, { params });
  }

  // D103: cambiar el cupo de usuarios. 409 MAX_USERS_BELOW_CURRENT si es menor que las cuentas que ya cuentan.
  updateMaxUsers(id: string, maxUsers: number) {
    return this.http.patch<SuccessResponse<Company>>(`${this.apiUrl}/${id}/max-users`, { max_users: maxUsers });
  }

  // D99: reenviar es emitir una clave nueva (la pendiente se anula) y mandarla por correo al administrativo. Nunca viaja en la respuesta.
  regenerateAccessKey(id: string) {
    return this.http.post<SuccessResponse<IssuedAccessKey>>(`${this.apiUrl}/${id}/access-key/regenerate`, {});
  }

  // D97: archivar corta el acceso y fija cuándo se borra todo; reactivar lo deshace dentro del plazo. Ambos piden el código de quien actúa.
  archiveCompany(id: string, body: ArchiveCompany) {
    return this.http.post<SuccessResponse<Company>>(`${this.apiUrl}/${id}/deactivation`, body);
  }

  reactivateCompany(id: string, body: ReactivateCompany) {
    return this.http.post<SuccessResponse<Company>>(`${this.apiUrl}/${id}/reactivation`, body);
  }
}
