import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { of, throwError } from 'rxjs';
import { CatalogFramework } from '@features/catalog/models/catalog.model';
import { CatalogService } from '@features/catalog/services/catalog.service';
import { Catalog } from './catalog';

const SOC2: CatalogFramework = { id: 'f1', code: 'soc2', name: 'SOC 2', version: '2017', type: 'attestation', availability: 'available', scope_description: '', counts: { requirements: 61, controls: 118, tests: 61 } };
const ISO: CatalogFramework = { id: 'f2', code: 'iso27001', name: 'ISO 27001', version: '2022', type: 'certification', availability: 'coming_soon', scope_description: '', counts: { requirements: 0, controls: 0, tests: 0 } };
// Las pruebas no necesitan filas completas: se entregan como el tipo que pide el servicio.
const page = (items: unknown[], total = items.length, totalPages = 1) => of({ items, page: 1, page_size: 25, total, total_pages: totalPages }) as never;
const CONTROL = { id: 'c1', code: 'CAP-1', name: 'Capacidad', domain: 'Gestión', origin: 'committee', is_active: true, dimensions: ['policy'], tests_count: 1, evidence_templates_count: 0 };

describe('Catalog (Monkey Admin)', () => {
    let api: jasmine.SpyObj<CatalogService>;
    let fixture: ComponentFixture<Catalog>;

    function setup(frameworks = [SOC2, ISO]): void {
        api = jasmine.createSpyObj<CatalogService>('CatalogService', ['frameworks', 'controls', 'risks', 'causes', 'tests', 'evidenceTemplates', 'control', 'risk', 'cause', 'test', 'evidenceTemplate', 'create', 'update', 'framework', 'pointsOfFocus']);
        api.frameworks.and.returnValue(of(frameworks));
        api.controls.and.returnValue(page([CONTROL], 1));
        api.risks.and.returnValue(page([]));
        api.causes.and.returnValue(page([]));
        api.tests.and.returnValue(page([]));
        api.evidenceTemplates.and.returnValue(page([]));
        TestBed.configureTestingModule({ imports: [Catalog], providers: [provideTranslateService(), { provide: CatalogService, useValue: api }] });
        fixture = TestBed.createComponent(Catalog);
        fixture.detectChanges();
    }

    const el = () => fixture.nativeElement as HTMLElement;
    const text = () => el().textContent ?? '';
    const choose = (selector: string, value: string) => {
        const select = el().querySelector<HTMLSelectElement>(selector)!;
        select.value = value;
        select.dispatchEvent(new Event('change'));
        fixture.detectChanges();
    };

    it('opens on the controls of the first available framework', () => {
        setup();
        expect(api.controls).toHaveBeenCalledWith(jasmine.objectContaining({ page: 1, framework_id: 'f1' }));
        expect(el().querySelector('[data-framework="soc2"]')!.getAttribute('aria-pressed')).toBe('true');
        expect(text()).toContain('CAP-1');
    });

    it('lists every framework with its counts, also the ones that are not available yet', () => {
        setup();
        expect(el().querySelectorAll('[data-frameworks] li').length).toBe(2);
        expect(el().querySelector('[data-framework="iso27001"]')).not.toBeNull();
    });

    it('asks for the controls of another framework when one is picked', () => {
        setup();
        el().querySelector<HTMLButtonElement>('[data-framework="iso27001"]')!.click();
        fixture.detectChanges();
        expect(api.controls).toHaveBeenCalledWith(jasmine.objectContaining({ framework_id: 'f2' }));
    });

    it('asks for the controls without a requirement (CPL-1) without a framework', () => {
        setup();
        choose('[data-scope]', 'unlinked');
        const last = api.controls.calls.mostRecent().args[0];
        expect(last.unlinked).toBeTrue();
        expect(last.framework_id).toBeUndefined();
    });

    it('asks for the whole catalog without a framework or a link filter', () => {
        setup();
        choose('[data-scope]', 'all');
        const last = api.controls.calls.mostRecent().args[0];
        expect(last.framework_id).toBeUndefined();
        expect(last.unlinked).toBeUndefined();
    });

    it('filters the controls that have no required evidence', () => {
        setup();
        const box = el().querySelector<HTMLInputElement>('[data-no-evidence]')!;
        box.checked = true;
        box.dispatchEvent(new Event('change'));
        fixture.detectChanges();
        expect(api.controls.calls.mostRecent().args[0].has_evidence_template).toBeFalse();
    });

    it('waits for the user to stop typing before searching, and goes back to the first page', fakeAsync(() => {
        setup();
        api.controls.calls.reset();
        const input = el().querySelector<HTMLInputElement>('[data-search]')!;
        for (const text of ['c', 'ca', 'cap']) {
            input.value = text;
            input.dispatchEvent(new Event('input'));
            tick(100);
        }
        expect(api.controls).not.toHaveBeenCalled();
        tick(300);
        expect(api.controls).toHaveBeenCalledTimes(1);
        expect(api.controls.calls.mostRecent().args[0]).toEqual(jasmine.objectContaining({ page: 1, search: 'cap' }));
    }));

    it('changes the list when another tab is picked, and the risks, causes and tests are not tied to a framework', () => {
        setup();
        el().querySelector<HTMLButtonElement>('[data-tab="risks"]')!.click();
        fixture.detectChanges();
        expect(api.risks).toHaveBeenCalled();
        expect(api.risks.calls.mostRecent().args[0].framework_id).toBeUndefined();
        expect(el().querySelector('[data-shared-note]')).not.toBeNull();
        expect(el().querySelector('[data-scope]')).toBeNull();
    });

    it('offers the dimension filter only on the tests', () => {
        setup();
        expect(el().querySelector('[data-dimension]')).toBeNull();
        el().querySelector<HTMLButtonElement>('[data-tab="tests"]')!.click();
        fixture.detectChanges();
        choose('[data-dimension]', 'server');
        expect(api.tests.calls.mostRecent().args[0].dimension).toBe('server');
    });

    it('sends the state and origin filters, keeping false as a real value', () => {
        setup();
        choose('[data-state]', 'inactive');
        expect(api.controls.calls.mostRecent().args[0].is_active).toBeFalse();
        choose('[data-origin]', 'monkey_admin');
        expect(api.controls.calls.mostRecent().args[0].origin).toBe('monkey_admin');
    });

    it('opens the detail of a row and closes it', () => {
        setup();
        api.control.and.returnValue(of({ ...CONTROL, description: 'd', source_ref: null, points_of_focus: [], dimensions: [], tests: [], evidence_templates: [], policies: [], causes: [] }) as never);
        el().querySelector<HTMLElement>('[data-row="c1"]')!.click();
        fixture.detectChanges();
        expect(api.control).toHaveBeenCalledWith('c1');
        expect(el().querySelector('[data-detail]')).not.toBeNull();
        expect(el().querySelector('[data-unlinked]')).not.toBeNull();
        el().querySelector<HTMLButtonElement>('[data-close]')!.click();
        fixture.detectChanges();
        expect(el().querySelector('[data-detail]')).toBeNull();
    });

    it('opens a short detail on the required evidence too, so it can be edited or retired', () => {
        setup();
        api.evidenceTemplates.and.returnValue(page([{ id: 'e1', code: 'DOC-001', description: 'Acta', dimension: 'policy', origin: 'committee', is_active: true, controls_count: 2 }]));
        api.evidenceTemplate.and.returnValue(of({ id: 'e1', code: 'DOC-001', description: 'Acta', dimension: 'policy', origin: 'committee', is_active: true, controls_count: 2 }) as never);
        el().querySelector<HTMLButtonElement>('[data-tab="evidence-templates"]')!.click();
        fixture.detectChanges();
        el().querySelector<HTMLElement>('[data-row="e1"]')!.click();
        fixture.detectChanges();
        expect(api.evidenceTemplate).toHaveBeenCalledWith('e1');
        expect(el().querySelector('[data-detail]')).not.toBeNull();
    });

    it('offers to add a new element of the kind of the tab that is open', () => {
        setup();
        const label = () => el().querySelector('[data-new]')!.textContent ?? '';
        expect(label()).toContain('CATALOG_MODULE.FORM.NEW.CONTROL');
        for (const [tab, kind] of [['risks', 'RISK'], ['causes', 'CAUSE'], ['tests', 'TEST'], ['evidence-templates', 'TEMPLATE']] as const) {
            el().querySelector<HTMLButtonElement>(`[data-tab="${tab}"]`)!.click();
            fixture.detectChanges();
            expect(label()).toContain(`CATALOG_MODULE.FORM.NEW.${kind}`);
        }
    });

    it('opens the form to create, and when it saves it reloads the list and opens the new element to link it', () => {
        setup();
        el().querySelector<HTMLButtonElement>('[data-new]')!.click();
        fixture.detectChanges();
        expect(el().querySelector('[data-form]')).not.toBeNull();
        api.controls.calls.reset();
        api.control.and.returnValue(of({ ...CONTROL, description: 'd', source_ref: null, points_of_focus: [], dimensions: [], tests: [], evidence_templates: [], policies: [], causes: [] }) as never);
        fixture.componentInstance.onSaved({ id: 'c1' });
        fixture.detectChanges();
        expect(el().querySelector('[data-form]')).toBeNull();
        expect(api.controls).toHaveBeenCalled();
        expect(api.control).toHaveBeenCalledWith('c1');
        expect(el().querySelector('[data-detail]')).not.toBeNull();
    });

    it('opens the form to edit with the current values when the detail asks for it', () => {
        setup();
        fixture.componentInstance.startEdit({ kind: 'risk', id: 'r1', initial: { name: 'Riesgo' } });
        fixture.detectChanges();
        expect(fixture.componentInstance.form).toEqual({ mode: 'edit', kind: 'risk', id: 'r1', initial: { name: 'Riesgo' } });
        el().querySelector<HTMLButtonElement>('[data-form] button[type="button"]')!.click();
        fixture.detectChanges();
        expect(fixture.componentInstance.form).toBeNull();
    });

    it('says so when nothing matches, and offers to retry when the catalog cannot be read', () => {
        setup();
        api.controls.and.returnValue(page([]));
        choose('[data-origin]', 'monkey_admin');
        expect(el().querySelector('[data-empty]')).not.toBeNull();
        api.controls.and.returnValue(throwError(() => new Error('down')));
        choose('[data-origin]', 'committee');
        expect(el().querySelector('[data-error]')).not.toBeNull();
        api.controls.and.returnValue(page([CONTROL]));
        el().querySelector<HTMLButtonElement>('[data-retry]')!.click();
        fixture.detectChanges();
        expect(el().querySelector('[data-error]')).toBeNull();
        expect(text()).toContain('CAP-1');
    });

    it('goes to the page that was asked for', () => {
        setup();
        api.controls.and.returnValue(page([CONTROL], 60, 3));
        choose('[data-origin]', 'committee');
        el().querySelector<HTMLButtonElement>('[data-next]')!.click();
        fixture.detectChanges();
        expect(api.controls.calls.mostRecent().args[0].page).toBe(2);
    });

    it('does not ask for controls of a framework when there is none to choose', () => {
        setup([]);
        expect(api.controls).not.toHaveBeenCalled();
        expect(el().querySelector('[data-frameworks]')).toBeNull();
    });
});
