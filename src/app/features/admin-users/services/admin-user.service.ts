import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '@environments/environment';
import { SuccessResponse } from '@shared/models/api-response.model';
import { AdminInvitation, AdminListQuery, AdminPage, AdminUser, InviteAdmin, InvitedAdmin } from '@features/admin-users/models/admin-user.model';

// contracts/gestion-usuarios/administradores.md. Sin estado: la pantalla guarda el suyo.
@Injectable({ providedIn: 'root' })
export class AdminUserService {
  private readonly http = inject(HttpClient);
  private readonly url = environment.apiUrl + '/admins';

  list(query: AdminListQuery) {
    let params = new HttpParams().set('page', query.page).set('page_size', query.pageSize).set('sort', query.sort);
    if (query.status) params = params.set('status', query.status);
    return this.http.get<SuccessResponse<AdminPage>>(this.url, { params });
  }

  invite(body: InviteAdmin) {
    return this.http.post<SuccessResponse<InvitedAdmin>>(this.url, body);
  }

  // Revoca el código vigente y manda uno nuevo; solo mientras la cuenta está `pending`. Nunca devuelve el código.
  resendInvitation(id: string) {
    return this.http.post<SuccessResponse<{ invitation: AdminInvitation }>>(`${this.url}/${id}/activation-code`, {});
  }

  // Pide el código del segundo factor de quien actúa.
  deactivate(id: string, totpCode: string) {
    return this.http.post<SuccessResponse<AdminUser>>(`${this.url}/${id}/deactivation`, { totp_code: totpCode });
  }

  // No pide segundo factor (D117, punto 6).
  reactivate(id: string) {
    return this.http.post<SuccessResponse<AdminUser>>(`${this.url}/${id}/reactivation`, {});
  }
}
