import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { of, throwError } from 'rxjs';
import { CatalogService } from '@features/catalog/services/catalog.service';
import { ItemPicker, Pick, PickKind } from './item-picker';

// Las pruebas no necesitan filas completas: se entregan con el tipo que pide el servicio.
const page = (items: unknown[]) => of({ items, page: 1, page_size: 25, total: items.length, total_pages: 1 }) as never;

describe('ItemPicker', () => {
    let api: jasmine.SpyObj<CatalogService>;
    let fixture: ComponentFixture<ItemPicker>;
    let picked: Pick[];

    function setup(kind: PickKind, inputs: { exclude?: string[]; onlyDimensions?: string[] | null } = {}): void {
        api = jasmine.createSpyObj<CatalogService>('CatalogService', ['tests', 'evidenceTemplates', 'causes', 'controls', 'risks', 'frameworks', 'framework', 'pointsOfFocus']);
        api.tests.and.returnValue(
            page([
                { id: 't1', code: 'T-DOC-001', name: 'Interno', display_name: 'Revisión', dimension: 'policy' },
                { id: 't2', code: 'T-SRV-001', name: 'Servidor', display_name: null, dimension: 'server' },
            ]),
        );
        api.causes.and.returnValue(page([{ id: 'c1', code: 'F001', name: 'Causa uno' }, { id: 'c2', code: 'F002', name: 'Causa dos' }]));
        api.evidenceTemplates.and.returnValue(page([{ id: 'e1', code: 'DOC-1', description: 'Acta' }]));
        api.frameworks.and.returnValue(of([{ id: 'f1', code: 'soc2', name: 'SOC 2', availability: 'available' }, { id: 'f2', code: 'iso', name: 'ISO', availability: 'coming_soon' }]) as never);
        api.framework.and.returnValue(of({ id: 'f1', requirements: [{ code: 'CC1.1', criterion: 'Integridad' }] }) as never);
        api.pointsOfFocus.and.returnValue(of([{ id: 'p1', requirement_code: 'CC1.1', number: 1, description: 'Primero' }, { id: 'p2', requirement_code: 'CC1.1', number: 2, description: 'Segundo' }]) as never);
        TestBed.configureTestingModule({ imports: [ItemPicker], providers: [provideTranslateService(), { provide: CatalogService, useValue: api }] });
        fixture = TestBed.createComponent(ItemPicker);
        fixture.componentRef.setInput('kind', kind);
        fixture.componentRef.setInput('exclude', inputs.exclude ?? []);
        fixture.componentRef.setInput('onlyDimensions', inputs.onlyDimensions ?? null);
        picked = [];
        fixture.componentInstance.picked.subscribe((p) => picked.push(p));
        fixture.detectChanges();
    }

    const el = () => fixture.nativeElement as HTMLElement;
    const choices = () => Array.from(el().querySelectorAll('[data-choice]')).map((b) => b.getAttribute('data-choice'));

    it('offers the active elements as soon as it opens', () => {
        setup('cause');
        expect(api.causes).toHaveBeenCalledWith(jasmine.objectContaining({ page: 1, is_active: true }));
        expect(choices()).toEqual(['c1', 'c2']);
    });

    it('leaves out what is already linked', () => {
        setup('cause', { exclude: ['c1'] });
        expect(choices()).toEqual(['c2']);
    });

    it('emits the id and the code of the one that is chosen', () => {
        setup('cause');
        el().querySelector<HTMLButtonElement>('[data-choice="c2"]')!.click();
        expect(picked).toEqual([{ id: 'c2', label: 'F002' }]);
    });

    it('searches after the user stops typing', fakeAsync(() => {
        setup('cause');
        api.causes.calls.reset();
        const input = el().querySelector<HTMLInputElement>('[data-pick-search]')!;
        for (const text of ['c', 'ca', 'cau']) {
            input.value = text;
            input.dispatchEvent(new Event('input'));
            tick(100);
        }
        expect(api.causes).not.toHaveBeenCalled();
        tick(300);
        expect(api.causes).toHaveBeenCalledOnceWith(jasmine.objectContaining({ search: 'cau', is_active: true }));
    }));

    it('offers only the tests of the dimensions the control has', () => {
        setup('test', { onlyDimensions: ['policy'] });
        expect(choices()).toEqual(['t1']);
    });

    it('says so when there is nothing to offer, and when it cannot be read', () => {
        setup('cause', { exclude: ['c1', 'c2'] });
        expect(el().querySelector('[data-pick-empty]')).not.toBeNull();
        api.causes.and.returnValue(throwError(() => new Error('down')));
        fixture.componentInstance.search();
        fixture.detectChanges();
        expect(el().querySelector('[data-pick-error]')).not.toBeNull();
    });

    it('picks a point of focus by framework and requirement, and hides the ones already linked', () => {
        setup('pof', { exclude: ['CC1.1#1'] });
        expect(api.framework).toHaveBeenCalledWith('f1');
        const requirement = el().querySelector<HTMLSelectElement>('[data-pick-requirement]')!;
        requirement.value = 'CC1.1';
        requirement.dispatchEvent(new Event('change'));
        fixture.detectChanges();
        expect(api.pointsOfFocus).toHaveBeenCalledWith('f1', 'CC1.1');
        expect(choices()).toEqual(['CC1.1#2']);
        el().querySelector<HTMLButtonElement>('[data-choice="CC1.1#2"]')!.click();
        expect(picked).toEqual([{ id: 'p2', label: 'CC1.1#2' }]);
    });

    it('tells the parent when it is cancelled', () => {
        setup('cause');
        let cancelled = 0;
        fixture.componentInstance.cancelled.subscribe(() => cancelled++);
        el().querySelector<HTMLButtonElement>('[data-pick-cancel]')!.click();
        expect(cancelled).toBe(1);
    });
});
