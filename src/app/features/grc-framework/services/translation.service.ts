import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '@environments/environment';
import { ApiResponse } from '@shared/models/api-response.model';

export type TranslationTargetLang = 'es' | 'en';

@Injectable({
  providedIn: 'root'
})
export class TranslationService {

  apiUrl = environment.apiUrl + '/translation';

  constructor(private http: HttpClient) { }

  translate(text: string, targetLang: TranslationTargetLang) {
    return this.http.post<ApiResponse<{ translatedText: string }>>(`${this.apiUrl}`, { text, targetLang });
  }

}
