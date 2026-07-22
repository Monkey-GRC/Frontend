import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '@environments/environment';
import { ApiResponse } from '@shared/models/api-response.model';

@Injectable({
  providedIn: 'root'
})
export class DashboardService {

  apiUrl = environment.apiUrl + '/dashboard';

  constructor(
    private http: HttpClient
  ) { }

  readSummary() {
    return this.http.get<ApiResponse>(`${this.apiUrl}/summary`);
  }

  readControls() {
    return this.http.get<ApiResponse>(`${this.apiUrl}/controls`);
  }

  readControlChecks(id: string) {
    return this.http.get<ApiResponse>(`${this.apiUrl}/controls/${id}/checks`);
  }

}
