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
    FormKind,
    FrameworkDetail,
    KIND_PATH,
    Paginated,
    PointOfFocusRef,
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

    evidenceTemplate(id: string) {
        return this.get<EvidenceTemplateRow>(`/evidence-templates/${id}`);
    }

    framework(id: string) {
        return this.get<FrameworkDetail>(`/frameworks/${id}`);
    }

    pointsOfFocus(frameworkId: string, requirementCode?: string): Observable<PointOfFocusRef[]> {
        const params: Record<string, string> = requirementCode ? { requirement_code: requirementCode } : {};
        return this.get<{ items: PointOfFocusRef[] }>(`/frameworks/${frameworkId}/points-of-focus`, params).pipe(map((r) => r.items));
    }

    // ---- escritura -----------------------------------------------------------------------------------------------------------------------------
    // Crear y editar responden con el elemento ya actualizado. Dar de baja no borra: `deactivate` y `reactivate` cambian `is_active` (contrato monkey-admin-catalog.md).

    create<T = unknown>(kind: FormKind, body: Record<string, unknown>): Observable<T> {
        return this.send<T>('post', `/${KIND_PATH[kind]}`, body);
    }

    update<T = unknown>(kind: FormKind, id: string, body: Record<string, unknown>): Observable<T> {
        return this.send<T>('patch', `/${KIND_PATH[kind]}/${id}`, body);
    }

    deactivate(kind: FormKind, id: string): Observable<void> {
        return this.http.delete<void>(`${this.base}/${KIND_PATH[kind]}/${id}`);
    }

    reactivate<T = unknown>(kind: FormKind, id: string): Observable<T> {
        return this.update<T>(kind, id, { is_active: true });
    }

    /** Un vínculo: `POST /<padre>/<id>/<segmento>` con el id del otro lado; responde con el padre ya actualizado. */
    link<T = unknown>(parent: FormKind, parentId: string, segment: string, body: Record<string, unknown>): Observable<T> {
        return this.send<T>('post', `/${KIND_PATH[parent]}/${parentId}/${segment}`, body);
    }

    /** Quitar un vínculo borra solo la relación, nunca los elementos. */
    unlink(parent: FormKind, parentId: string, segment: string, childId: string): Observable<void> {
        return this.http.delete<void>(`${this.base}/${KIND_PATH[parent]}/${parentId}/${segment}/${childId}`);
    }

    private send<T>(verb: 'post' | 'patch', path: string, body: Record<string, unknown>): Observable<T> {
        const url = this.base + path;
        const request = verb === 'post' ? this.http.post<SuccessResponse<T>>(url, body) : this.http.patch<SuccessResponse<T>>(url, body);
        return request.pipe(map((r) => r.data as T));
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
