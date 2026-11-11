import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, map, switchMap, of } from 'rxjs';
import { environment } from '@environments/environment';
import { Company, Paginated } from '@shared/models/company.model';
import { SuccessResponse } from '@shared/models/api-response.model';

const PAGE_SIZE = 100; // el máximo que admite el backend
const MAX_PAGES = 10; // tope de seguridad: hasta 1.000 empresas; con más, el home avisa que las cifras son parciales

export interface CompaniesSnapshot {
    companies: Company[];
    // Cuántas empresas existen en total (puede ser mayor que `companies.length` si se llegó al tope).
    total: number;
}

// Trae todas las empresas, de a 100, para calcular las métricas del home. No hay un endpoint de métricas: mientras sean pocas empresas esto
// es barato; cuando crezcan conviene un endpoint que ya devuelva los conteos.
@Injectable({ providedIn: 'root' })
export class HomeMetricsService {
    private readonly http = inject(HttpClient);
    private readonly url = `${environment.apiUrl}/companies`;

    readAll(): Observable<CompaniesSnapshot> {
        return this.page(1).pipe(
            switchMap((first) => {
                const pages = Math.min(first.total_pages, MAX_PAGES);
                if (pages <= 1) return of({ companies: first.items, total: first.total });
                const rest = Array.from({ length: pages - 1 }, (_, i) => this.page(i + 2));
                return forkJoin(rest).pipe(map((others) => ({ companies: [first, ...others].flatMap((p) => p.items), total: first.total })));
            }),
        );
    }

    private page(page: number): Observable<Paginated<Company>> {
        const params = new HttpParams().set('page', page).set('page_size', PAGE_SIZE).set('sort', '-created_at');
        return this.http.get<SuccessResponse<Paginated<Company>>>(this.url, { params }).pipe(map((res) => res.data as Paginated<Company>));
    }
}
