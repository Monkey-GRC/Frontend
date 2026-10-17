import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '@environments/environment';
import {
    CatalogFilters,
    CatalogFramework,
    CauseDetail,
    CauseRow,
    ControlDetail,
    ControlRow,
    EvidenceTemplateRow,
    Paginated,
    RiskDetail,
    RiskRow,
    TestDetail,
    TestRow,
} from '@features/catalog/models/catalog.model';
import { SuccessResponse } from '@shared/models/api-response.model';

export const CATALOG_PAGE_SIZE = 25;

// Lectura del catálogo maestro (contracts/modules/monkey-admin-catalog.md). Solo `admin_monkey`; cualquier otro rol recibe 403.
@Injectable({ providedIn: 'root' })
export class CatalogService {
    private readonly http = inject(HttpClient);
    private readonly base = environment.apiUrl + '/catalog';

    frameworks(): Observable<CatalogFramework[]> {
        return this.get<Paginated<CatalogFramework>>('/frameworks', { page: 1, page_size: 100 }).pipe(map((p) => p.items));
    }

    controls(filters: CatalogFilters) {
        return this.get<Paginated<ControlRow>>('/controls', this.query(filters));
    }

    control(id: string) {
        return this.get<ControlDetail>(`/controls/${id}`);
    }

    risks(filters: CatalogFilters) {
        return this.get<Paginated<RiskRow>>('/risks', this.query(filters));
    }

    risk(id: string) {
        return this.get<RiskDetail>(`/risks/${id}`);
    }

    causes(filters: CatalogFilters) {
        return this.get<Paginated<CauseRow>>('/causes', this.query(filters));
    }

    cause(id: string) {
        return this.get<CauseDetail>(`/causes/${id}`);
    }

    tests(filters: CatalogFilters) {
        return this.get<Paginated<TestRow>>('/tests', this.query(filters));
    }

    test(id: string) {
        return this.get<TestDetail>(`/tests/${id}`);
    }

    evidenceTemplates(filters: CatalogFilters) {
        return this.get<Paginated<EvidenceTemplateRow>>('/evidence-templates', this.query(filters));
    }

    // Solo viajan los filtros que tienen valor: el backend rechaza (422) los que no conoce y no distingue «vacío» de «sin filtro».
    private query(filters: CatalogFilters): Record<string, string | number | boolean> {
        const { page, ...rest } = filters;
        const params: Record<string, string | number | boolean> = { page, page_size: CATALOG_PAGE_SIZE };
        for (const [key, value] of Object.entries(rest)) {
            if (value !== undefined && value !== null && value !== '') params[key] = value as string | number | boolean;
        }
        return params;
    }

    private get<T>(path: string, params: Record<string, string | number | boolean> = {}): Observable<T> {
        let httpParams = new HttpParams();
        for (const [key, value] of Object.entries(params)) httpParams = httpParams.set(key, String(value));
        return this.http.get<SuccessResponse<T>>(this.base + path, { params: httpParams }).pipe(map((r) => r.data as T));
    }
}
