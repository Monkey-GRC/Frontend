import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '@environments/environment';
import { ChecklistCheck, ChecklistOS } from '@features/grc-framework/models/checklist.model';
import { ApiResponse } from '@shared/models/api-response.model';

@Injectable({
  providedIn: 'root'
})
export class ChecklistService {

  apiUrl = environment.apiUrl + '/checklist';

  constructor(private http: HttpClient) { }

  getChecklist(os: ChecklistOS) {
    const params = new HttpParams().set('os', os);
    return this.http.get<ApiResponse<ChecklistCheck[]>>(`${this.apiUrl}`, { params });
  }

}
