import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { CatalogService } from './catalog.service';

describe('CatalogService', () => {
    let service: CatalogService;
    let http: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
        service = TestBed.inject(CatalogService);
        http = TestBed.inject(HttpTestingController);
    });
    afterEach(() => http.verify());

    const page = (items: unknown[]) => ({ statusCode: 200, message: 'ok', data: { items, page: 1, page_size: 25, total: items.length, total_pages: 1 } });

    it('lists the frameworks of the master catalog', () => {
        let ids: string[] = [];
        service.frameworks().subscribe((list) => (ids = list.map((f) => f.id)));
        const req = http.expectOne((r) => r.url.endsWith('/catalog/frameworks'));
        expect(req.request.params.get('page_size')).toBe('100');
        req.flush(page([{ id: 'f1' }, { id: 'f2' }]));
        expect(ids).toEqual(['f1', 'f2']);
    });

    it('sends only the filters that have a value, so the backend never gets an empty one', () => {
        service.controls({ page: 2, search: '', origin: undefined, framework_id: 'f1', unlinked: undefined, has_evidence_template: false }).subscribe();
        const req = http.expectOne((r) => r.url.endsWith('/catalog/controls'));
        const params = req.request.params;
        expect(params.keys().sort()).toEqual(['framework_id', 'has_evidence_template', 'page', 'page_size']);
        expect(params.get('page')).toBe('2');
        expect(params.get('page_size')).toBe('25');
        expect(params.get('has_evidence_template')).toBe('false');
        req.flush(page([]));
    });

    it('keeps a false filter: asking for the inactive ones is not the same as asking for all', () => {
        service.risks({ page: 1, is_active: false }).subscribe();
        const req = http.expectOne((r) => r.url.endsWith('/catalog/risks'));
        expect(req.request.params.get('is_active')).toBe('false');
        req.flush(page([]));
    });

    it('asks for the unlinked controls, the ones that hang from no requirement', () => {
        service.controls({ page: 1, unlinked: true }).subscribe();
        const req = http.expectOne((r) => r.url.endsWith('/catalog/controls'));
        expect(req.request.params.get('unlinked')).toBe('true');
        req.flush(page([]));
    });

    it('filters the tests by dimension', () => {
        service.tests({ page: 1, dimension: 'server' }).subscribe();
        const req = http.expectOne((r) => r.url.endsWith('/catalog/tests'));
        expect(req.request.params.get('dimension')).toBe('server');
        req.flush(page([]));
    });

    it('reads the detail of each kind from its own route', () => {
        const detail = { statusCode: 200, message: 'ok', data: { id: 'x', code: 'C' } };
        const routes: [() => unknown, string][] = [
            [() => service.control('x').subscribe(), '/catalog/controls/x'],
            [() => service.risk('x').subscribe(), '/catalog/risks/x'],
            [() => service.cause('x').subscribe(), '/catalog/causes/x'],
            [() => service.test('x').subscribe(), '/catalog/tests/x'],
        ];
        for (const [call, path] of routes) {
            call();
            http.expectOne((r) => r.url.endsWith(path)).flush(detail);
        }
    });
    describe('writing', () => {
        const ok = { statusCode: 200, message: 'ok', data: { id: 'x' } };

        it('creates each kind of element at its own route and returns the saved one', () => {
            const routes: [string, string][] = [['control', '/catalog/controls'], ['risk', '/catalog/risks'], ['cause', '/catalog/causes'], ['template', '/catalog/evidence-templates'], ['test', '/catalog/tests']];
            for (const [kind, path] of routes) {
                let saved: unknown;
                service.create(kind as never, { code: 'X' }).subscribe((s) => (saved = s));
                const req = http.expectOne((r) => r.url.endsWith(path));
                expect(req.request.method).toBe('POST');
                expect(req.request.body).toEqual({ code: 'X' });
                req.flush(ok);
                expect(saved).toEqual({ id: 'x' });
            }
        });

        it('edits with a PATCH that carries only what is sent', () => {
            service.update('control', 'k1', { name: 'Nuevo' }).subscribe();
            const req = http.expectOne((r) => r.url.endsWith('/catalog/controls/k1'));
            expect(req.request.method).toBe('PATCH');
            expect(req.request.body).toEqual({ name: 'Nuevo' });
            req.flush(ok);
        });

        it('retires with DELETE and reactivates with is_active: true, never deleting', () => {
            service.deactivate('risk', 'r1').subscribe();
            const del = http.expectOne((r) => r.url.endsWith('/catalog/risks/r1'));
            expect(del.request.method).toBe('DELETE');
            del.flush(null);
            service.reactivate('risk', 'r1').subscribe();
            const patch = http.expectOne((r) => r.url.endsWith('/catalog/risks/r1'));
            expect(patch.request.method).toBe('PATCH');
            expect(patch.request.body).toEqual({ is_active: true });
            patch.flush(ok);
        });

        it('links at the route of the parent and unlinks with the id of the other side', () => {
            service.link('control', 'k1', 'tests', { test_id: 't1' }).subscribe();
            const link = http.expectOne((r) => r.url.endsWith('/catalog/controls/k1/tests'));
            expect(link.request.method).toBe('POST');
            expect(link.request.body).toEqual({ test_id: 't1' });
            link.flush(ok);
            service.unlink('cause', 'c1', 'controls', 'k1').subscribe();
            const unlink = http.expectOne((r) => r.url.endsWith('/catalog/causes/c1/controls/k1'));
            expect(unlink.request.method).toBe('DELETE');
            unlink.flush(null);
        });

        it('reads the requirements of a framework and its points of focus, narrowed to a requirement', () => {
            service.framework('f1').subscribe();
            http.expectOne((r) => r.url.endsWith('/catalog/frameworks/f1')).flush(ok);
            let ids: string[] = [];
            service.pointsOfFocus('f1', 'CC1.1').subscribe((list) => (ids = list.map((p) => p.id)));
            const req = http.expectOne((r) => r.url.endsWith('/catalog/frameworks/f1/points-of-focus'));
            expect(req.request.params.get('requirement_code')).toBe('CC1.1');
            req.flush({ statusCode: 200, message: 'ok', data: { items: [{ id: 'p1' }] } });
            expect(ids).toEqual(['p1']);
            service.evidenceTemplate('e1').subscribe();
            http.expectOne((r) => r.url.endsWith('/catalog/evidence-templates/e1')).flush(ok);
        });
    });
});
