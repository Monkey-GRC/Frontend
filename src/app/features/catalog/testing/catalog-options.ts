import { Provider } from '@angular/core';
import { of } from 'rxjs';
import { CatalogOption, OptionName } from '@features/catalog/models/catalog.model';
import { CatalogOptionsService } from '@features/catalog/services/catalog-options.service';

// Lo que respondería el backend (`GET /v1/catalogs/{nombre}`) para las listas de esta pantalla, con textos propios de las pruebas (distintos de cualquier traducción
// del front): si un spec ve estos textos en pantalla, es que salieron del backend y no de una lista escrita a mano.
const pairs = (...values: string[]): CatalogOption[] => values.map((value) => ({ value, label: `«${value}»` }));

export const OPTIONS: Record<OptionName, CatalogOption[]> = {
    dimension: pairs('policy', 'server', 'database', 'app', 'cloud'),
    control_type: pairs('manual', 'automated', 'hybrid', 'technical_manual'),
    risk_criterion: pairs('confidentiality', 'integrity', 'availability', 'privacy', 'compliance', 'security', 'continuity', 'third_parties', 'fraud', 'reputation', 'operations'),
    failure_category: pairs('human_resource', 'processes', 'information_technology', 'infrastructure', 'external', 'governance'),
    catalog_origin: pairs('committee', 'monkey_admin'),
};

/** El servicio de listas con las respuestas ya cargadas, sin tocar la red. */
export function optionsServiceStub(): Partial<CatalogOptionsService> {
    return {
        load: () => of(undefined),
        options: (name: OptionName) => OPTIONS[name],
        label: (name: OptionName, value: string | null | undefined) => (value ? (OPTIONS[name].find((o) => o.value === value)?.label ?? value) : '—'),
    };
}

export const provideOptionsStub = (): Provider => ({ provide: CatalogOptionsService, useValue: optionsServiceStub() });
