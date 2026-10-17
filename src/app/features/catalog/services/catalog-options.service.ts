import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, map, of, tap } from 'rxjs';
import { environment } from '@environments/environment';
import { CatalogOption, OptionName } from '@features/catalog/models/catalog.model';
import { SuccessResponse } from '@shared/models/api-response.model';

// Las listas de opciones (dimensiones, tipos de control, criterios de riesgo, categorías de falla, orígenes…) las sirve el backend en `GET /v1/catalogs/{nombre}`, leídas de los
// enums de Postgres, con su texto en el idioma de la sesión. Esta pantalla no escribe ninguna a mano ni mantiene sus propias etiquetas: pide las que necesita (`load`) y
// después las consulta de forma síncrona (`options`, `label`). La caché es por idioma, porque el texto cambia con él.
@Injectable({ providedIn: 'root' })
export class CatalogOptionsService {
    private readonly http = inject(HttpClient);
    private readonly base = environment.apiUrl + '/catalogs';
    private readonly cache = new Map<string, CatalogOption[]>();

    /** Pide las listas que faltan (las que ya están no se vuelven a pedir). Avisa cuando todas están disponibles. */
    load(names: OptionName[]): Observable<void> {
        const missing = [...new Set(names)].filter((name) => !this.cache.has(this.key(name)));
        if (missing.length === 0) return of(undefined);
        return forkJoin(
            missing.map((name) =>
                this.http.get<SuccessResponse<{ items: CatalogOption[] }>>(`${this.base}/${name}`).pipe(
                    map((r) => r.data?.items ?? []),
                    tap((items) => this.cache.set(this.key(name), items)),
                ),
            ),
        ).pipe(map(() => undefined));
    }

    /** La lista, en el orden del backend; vacía mientras no se haya cargado. */
    options(name: OptionName): CatalogOption[] {
        return this.cache.get(this.key(name)) ?? [];
    }

    /** El texto de un valor. Si la lista aún no llegó o el valor es nuevo, se muestra el valor tal cual: una opción nueva del backend nunca rompe ni oculta la pantalla. */
    label(name: OptionName, value: string | null | undefined): string {
        if (!value) return '—';
        return this.options(name).find((o) => o.value === value)?.label ?? value;
    }

    private key(name: OptionName): string {
        return `${localStorage.getItem('lang') || 'es'}:${name}`;
    }
}
