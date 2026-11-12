import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { CatalogOptionsService } from './catalog-options.service';

describe('CatalogOptionsService', () => {
    let service: CatalogOptionsService;
    let http: HttpTestingController;

    beforeEach(() => {
        localStorage.removeItem('lang');
        TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
        service = TestBed.inject(CatalogOptionsService);
        http = TestBed.inject(HttpTestingController);
    });

    afterEach(() => http.verify());

    it('asks the backend for each list once and answers the rest from memory', () => {
        service.load(['dimension', 'dimension', 'catalog_origin']).subscribe();
        http.expectOne((r) => r.url.endsWith('/catalogs/dimension')).flush({ data: { items: [{ value: 'policy', label: 'Documental' }] } });
        http.expectOne((r) => r.url.endsWith('/catalogs/catalog_origin')).flush({ data: { items: [{ value: 'committee', label: 'Comité' }] } });
        service.load(['dimension']).subscribe();
        http.expectNone((r) => r.url.endsWith('/catalogs/dimension'));
        expect(service.options('dimension')).toEqual([{ value: 'policy', label: 'Documental' }]);
        expect(service.label('catalog_origin', 'committee')).toBe('Comité');
    });

    it('shows the raw value of a value a loaded list does not know, and never the raw value before the list arrives', () => {
        expect(service.options('control_type')).toEqual([]);
        expect(service.label('control_type', 'manual')).toBe('');
        expect(service.label('control_type', null)).toBe('—');
        service.load(['control_type']).subscribe();
        http.expectOne((r) => r.url.endsWith('/catalogs/control_type')).flush({ data: { items: [{ value: 'auto', label: 'Automático' }] } });
        expect(service.label('control_type', 'manual')).toBe('manual');
    });

    it('keeps one list per language', () => {
        service.load(['dimension']).subscribe();
        http.expectOne((r) => r.url.endsWith('/catalogs/dimension')).flush({ data: { items: [{ value: 'policy', label: 'Documental' }] } });
        localStorage.setItem('lang', 'en');
        expect(service.options('dimension')).toEqual([]);
        service.load(['dimension']).subscribe();
        http.expectOne((r) => r.url.endsWith('/catalogs/dimension')).flush({ data: { items: [{ value: 'policy', label: 'Policy' }] } });
        expect(service.label('dimension', 'policy')).toBe('Policy');
        localStorage.removeItem('lang');
    });
});
