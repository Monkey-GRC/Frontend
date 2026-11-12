import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { of, throwError } from 'rxjs';
import { ApiError, FormKind } from '@features/catalog/models/catalog.model';
import { CatalogService } from '@features/catalog/services/catalog.service';
import { provideOptionsStub } from '@features/catalog/testing/catalog-options';
import { CatalogForm } from './catalog-form';

const apiError = (message: string, extra: Partial<ApiError> = {}): ApiError => Object.assign(new Error(message), extra);

describe('CatalogForm', () => {
    let api: jasmine.SpyObj<CatalogService>;
    let fixture: ComponentFixture<CatalogForm>;
    let saved: unknown[];

    function setup(kind: FormKind, mode: 'create' | 'edit', initial: Record<string, unknown> = {}): void {
        api = jasmine.createSpyObj<CatalogService>('CatalogService', ['create', 'update']);
        TestBed.configureTestingModule({ imports: [CatalogForm], providers: [provideTranslateService(), provideOptionsStub(), { provide: CatalogService, useValue: api }] });
        fixture = TestBed.createComponent(CatalogForm);
        fixture.componentRef.setInput('kind', kind);
        fixture.componentRef.setInput('mode', mode);
        fixture.componentRef.setInput('itemId', mode === 'edit' ? 'id-1' : null);
        fixture.componentRef.setInput('initial', initial);
        saved = [];
        fixture.componentInstance.saved.subscribe((s) => saved.push(s));
        fixture.detectChanges();
    }

    const el = () => fixture.nativeElement as HTMLElement;
    const type = (field: string, value: string) => {
        const input = el().querySelector<HTMLInputElement | HTMLTextAreaElement>(`[data-field="${field}"]`)!;
        input.value = value;
        input.dispatchEvent(new Event('input'));
        fixture.detectChanges();
    };
    const choose = (field: string, value: string) => {
        const select = el().querySelector<HTMLSelectElement>(`[data-field="${field}"]`)!;
        select.value = value;
        select.dispatchEvent(new Event('change'));
        fixture.detectChanges();
    };
    const submit = () => {
        el().querySelector<HTMLFormElement>('[data-form]')!.dispatchEvent(new Event('submit'));
        fixture.detectChanges();
    };
    const fillControl = () => {
        type('code', 'CTL-9');
        type('name', 'Un control');
        type('description', 'Lo que hace.');
        type('domain', 'Gestión de Activos');
    };

    it('asks for the required fields and says which are missing, without calling the backend', () => {
        setup('control', 'create');
        submit();
        expect(api.create).not.toHaveBeenCalled();
        for (const field of ['code', 'name', 'description', 'domain']) expect(el().querySelector(`[data-error="${field}"]`)).not.toBeNull();
        expect(el().querySelector('[data-error="source_ref"]')).toBeNull();
    });

    it('rejects a code with spaces before sending it', () => {
        setup('control', 'create');
        fillControl();
        type('code', 'con espacios');
        submit();
        expect(api.create).not.toHaveBeenCalled();
        expect(el().querySelector('[data-error="code"]')).not.toBeNull();
    });

    it('creates the element sending only the fields that have a value, trimmed', () => {
        setup('control', 'create');
        api.create.and.returnValue(of({ id: 'new' }));
        fillControl();
        type('name', '  Un control  ');
        submit();
        expect(api.create).toHaveBeenCalledOnceWith('control', { code: 'CTL-9', name: 'Un control', description: 'Lo que hace.', domain: 'Gestión de Activos' });
        expect(saved).toEqual([{ id: 'new' }]);
    });

    it('lets a risk or a cause leave the code empty: the server assigns the next free one', () => {
        setup('risk', 'create');
        api.create.and.returnValue(of({ id: 'r' }));
        type('name', 'Riesgo');
        type('description', 'Descripción');
        choose('trust_criterion', 'security');
        type('potential_impact', 'Reputacional\n\n  Financiero  ');
        submit();
        expect(api.create).toHaveBeenCalledOnceWith('risk', { name: 'Riesgo', description: 'Descripción', trust_criterion: 'security', potential_impact: ['Reputacional', 'Financiero'] });
    });

    it('starts a new test in the documentary dimension and keeps the committee texts folded away until asked', () => {
        setup('test', 'create');
        expect(el().querySelector<HTMLSelectElement>('[data-field="dimension"]')!.value).toBe('policy');
        expect(el().querySelector('[data-field="tool"]')).toBeNull();
        el().querySelector<HTMLButtonElement>('[data-committee-toggle]')!.click();
        fixture.detectChanges();
        expect(el().querySelector('[data-field="tool"]')).not.toBeNull();
    });

    it('fills the selects with the lists the backend serves, with their text', () => {
        setup('risk', 'create');
        const options = Array.from(el().querySelectorAll<HTMLOptionElement>('[data-field="trust_criterion"] option'));
        expect(options.map((o) => o.value)).toContain('third_parties');
        expect(options.find((o) => o.value === 'security')!.textContent).toContain('«security»');
    });

    it('edits sending only what changed, and the code is not editable', () => {
        setup('control', 'edit', { code: 'CTL-9', name: 'Antes', description: 'D', domain: 'X', source_ref: null });
        expect(el().querySelector('[data-field="code"]')).toBeNull();
        expect(el().querySelector<HTMLButtonElement>('[data-save]')!.disabled).toBeTrue();
        api.update.and.returnValue(of({ id: 'id-1' }));
        type('name', 'Después');
        expect(el().querySelector<HTMLButtonElement>('[data-save]')!.disabled).toBeFalse();
        submit();
        expect(api.update).toHaveBeenCalledOnceWith('control', 'id-1', { name: 'Después' });
    });

    it('shows a list as one line per item when editing, and sends it back as a list', () => {
        setup('risk', 'edit', { name: 'R', description: 'D', trust_criterion: 'security', potential_impact: ['Reputacional', 'Financiero'] });
        expect(el().querySelector<HTMLTextAreaElement>('[data-field="potential_impact"]')!.value).toBe('Reputacional\nFinanciero');
        api.update.and.returnValue(of({ id: 'id-1' }));
        type('potential_impact', 'Reputacional');
        submit();
        expect(api.update).toHaveBeenCalledOnceWith('risk', 'id-1', { potential_impact: ['Reputacional'] });
    });

    it('shows the errors of the backend next to their field, and opens the committee section when one is there', () => {
        setup('test', 'create');
        api.create.and.returnValue(
            throwError(() => apiError('validation', { status: 422, fields: [{ field: 'display_name', code: 'text.names_provider', message: 'No puede nombrar al proveedor.' }, { field: 'tool', code: 'x', message: 'Texto inválido.' }] })),
        );
        type('code', 'T-DOC-900');
        type('name', 'n');
        type('display_name', 'Con Wazuh');
        type('display_description', 'd');
        type('objective', 'o');
        type('type', 'Manual');
        submit();
        expect(el().querySelector('[data-error="display_name"]')!.textContent).toContain('No puede nombrar al proveedor.');
        expect(el().querySelector('[data-error="tool"]')!.textContent).toContain('Texto inválido.');
    });

    it('shows a general notice when the backend refuses without a field (a repeated code)', () => {
        setup('control', 'create');
        api.create.and.returnValue(throwError(() => apiError('Ya existe un elemento con ese código.', { status: 409, code: 'CODE_ALREADY_EXISTS' })));
        fillControl();
        submit();
        expect(el().querySelector('[data-banner]')!.textContent).toContain('Ya existe un elemento con ese código.');
        expect(saved).toEqual([]);
    });

    it('clears the error of a field as soon as it is edited', () => {
        setup('control', 'create');
        submit();
        expect(el().querySelector('[data-error="name"]')).not.toBeNull();
        type('name', 'Algo');
        expect(el().querySelector('[data-error="name"]')).toBeNull();
    });

    it('lives in a modal: Escape does not throw away what was typed, Cancel still closes', () => {
        setup('control', 'create');
        let cancelled = 0;
        fixture.componentInstance.cancelled.subscribe(() => cancelled++);
        const escape = () => {
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
            fixture.detectChanges();
        };
        escape();
        expect(cancelled).toBe(1); // nothing typed yet: Escape closes
        type('name', 'Un control');
        escape();
        expect(cancelled).toBe(1); // with data: Escape is ignored
        el().querySelector<HTMLButtonElement>('[data-cancel]')!.click();
        expect(cancelled).toBe(2);
    });
});
