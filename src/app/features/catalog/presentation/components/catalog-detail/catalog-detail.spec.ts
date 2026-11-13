import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { Subject, of, throwError } from 'rxjs';
import { ApiError } from '@features/catalog/models/catalog.model';
import { CatalogService } from '@features/catalog/services/catalog.service';
import { provideOptionsStub } from '@features/catalog/testing/catalog-options';
import { CatalogDetail, DetailKind, EditRequest } from './catalog-detail';
import { pickOption } from '@shared/presentation/components/select/select.testing';

const empty = of({ items: [], page: 1, page_size: 25, total: 0, total_pages: 1 }) as never;

const CONTROL = {
    id: 'k1', code: 'CTL-1', name: 'Control', description: 'Descripción', domain: 'Gestión', source_ref: null, origin: 'monkey_admin', is_active: true,
    points_of_focus: [{ id: 'p1', framework_code: 'soc2', requirement_code: 'CC1.1', number: 1, description: 'Primero' }],
    dimensions: [{ dimension: 'policy', type: 'manual', requires_probe: false, requires_ai: false, requires_compliance_confirmation: false }],
    tests: [{ id: 't1', code: 'T-DOC-001', dimension: 'policy', display_name: 'Revisión', is_active: true }],
    evidence_templates: [{ id: 'e1', code: 'DOC-1', description: 'Acta', sequence: 1 }],
    policies: [],
    causes: [{ id: 'c1', code: 'F001', name: 'Causa' }],
};
const RISK = { id: 'r1', code: 'R011', name: 'Riesgo', description: 'D', trust_criterion: 'security', potential_impact: ['Reputacional'], origin: 'committee', is_active: true, causes: [{ id: 'c1', code: 'F001', name: 'Causa' }] };
const CAUSE = { id: 'c1', code: 'F001', name: 'Causa', description: 'D', failure_category: 'processes', origin: 'committee', is_active: true, risks: [{ id: 'r1', code: 'R011', name: 'Riesgo' }], controls: [{ id: 'k1', code: 'CTL-1', name: 'Control' }] };
const TEST = { id: 't1', code: 'T-DOC-001', name: 'Interno', dimension: 'policy', display_name: 'Revisión', display_description: 'Desc', origin: 'committee', is_active: true, committee: { objective: 'O', tool: 'T', step_by_step: ['a', 'b'] }, controls: [] };
const TEMPLATE = { id: 'e1', code: 'DOC-1', description: 'Acta de la revisión', dimension: 'policy', origin: 'monkey_admin', is_active: true, controls_count: 3 };

const apiError = (message: string): ApiError => Object.assign(new Error(message), { status: 409 });

describe('CatalogDetail', () => {
    let api: jasmine.SpyObj<CatalogService>;
    let fixture: ComponentFixture<CatalogDetail>;
    let changed: number;
    let edits: EditRequest[];

    function setup(kind: DetailKind, detail: object): void {
        api = jasmine.createSpyObj<CatalogService>('CatalogService', ['control', 'risk', 'cause', 'test', 'evidenceTemplate', 'deactivate', 'reactivate', 'link', 'unlink', 'tests', 'evidenceTemplates', 'causes', 'controls', 'risks', 'frameworks']);
        api.control.and.returnValue(of(CONTROL) as never);
        api.risk.and.returnValue(of(RISK) as never);
        api.cause.and.returnValue(of(CAUSE) as never);
        api.test.and.returnValue(of(TEST) as never);
        api.evidenceTemplate.and.returnValue(of(TEMPLATE) as never);
        for (const list of [api.tests, api.evidenceTemplates, api.causes, api.controls, api.risks]) list.and.returnValue(empty);
        api.frameworks.and.returnValue(of([]));
        api.deactivate.and.returnValue(of(undefined));
        api.reactivate.and.returnValue(of({}));
        api.link.and.returnValue(of({}));
        api.unlink.and.returnValue(of(undefined));
        const byKind: Record<DetailKind, jasmine.Spy> = { controls: api.control, risks: api.risk, causes: api.cause, tests: api.test, 'evidence-templates': api.evidenceTemplate };
        byKind[kind].and.returnValue(of(detail));
        TestBed.configureTestingModule({ imports: [CatalogDetail], providers: [provideTranslateService(), provideOptionsStub(), { provide: CatalogService, useValue: api }] });
        fixture = TestBed.createComponent(CatalogDetail);
        fixture.componentRef.setInput('kind', kind);
        fixture.componentRef.setInput('itemId', (detail as { id: string }).id);
        changed = 0;
        edits = [];
        fixture.componentInstance.changed.subscribe(() => changed++);
        fixture.componentInstance.editRequested.subscribe((e) => edits.push(e));
        fixture.detectChanges();
    }

    const el = () => fixture.nativeElement as HTMLElement;
    const click = (selector: string) => {
        el().querySelector<HTMLElement>(selector)!.click();
        fixture.detectChanges();
    };

    it('asks to edit with the current values, the committee texts of a test included', () => {
        setup('tests', TEST);
        click('[data-edit]');
        expect(edits).toEqual([{ kind: 'test', id: 't1', initial: jasmine.objectContaining({ name: 'Interno', display_name: 'Revisión', objective: 'O', tool: 'T', step_by_step: ['a', 'b'] }) }]);
    });

    it('asks before retiring, and retiring does not delete: it reloads and tells the list', () => {
        setup('controls', CONTROL);
        click('[data-deactivate]');
        expect(api.deactivate).not.toHaveBeenCalled();
        expect(el().querySelector('[data-confirm]')).not.toBeNull();
        click('[data-confirm-yes]');
        expect(api.deactivate).toHaveBeenCalledOnceWith('control', 'k1');
        expect(api.control).toHaveBeenCalledTimes(2);
        expect(changed).toBe(1);
    });

    it('keeps the confirm button busy until the answer arrives and does not send twice (D116)', () => {
        setup('controls', CONTROL);
        const answer = new Subject<undefined>();
        api.deactivate.and.returnValue(answer as never);
        click('[data-deactivate]');
        click('[data-confirm-yes]');
        fixture.detectChanges();
        expect(el().querySelector('[data-confirm-yes]')!.getAttribute('aria-busy')).toBe('true');
        click('[data-confirm-yes]');
        expect(api.deactivate).toHaveBeenCalledTimes(1);
        answer.next(undefined);
        answer.complete();
        fixture.detectChanges();
        expect(fixture.componentInstance.busy).toBeFalse();
        expect(changed).toBe(1);
    });

    it('reactivates a retired element, and says it is not offered to new services', () => {
        setup('risks', { ...RISK, is_active: false });
        expect(el().querySelector('[data-deactivate]')).toBeNull();
        click('[data-reactivate]');
        expect(api.reactivate).toHaveBeenCalledOnceWith('risk', 'r1');
        expect(changed).toBe(1);
    });

    it('shows the message of the backend when an action is refused, and drops the confirmation', () => {
        setup('controls', CONTROL);
        api.deactivate.and.returnValue(throwError(() => apiError('Otro elemento activo lo necesita.')));
        click('[data-deactivate]');
        click('[data-confirm-yes]');
        expect(el().querySelector('[data-action-error]')!.textContent).toContain('Otro elemento activo lo necesita.');
        expect(el().querySelector('[data-confirm]')).toBeNull();
        expect(changed).toBe(0);
    });

    it('links a test to a control, offering only the dimensions the control has', () => {
        setup('controls', CONTROL);
        click('[data-add="test"]');
        const picker = fixture.componentInstance;
        expect(picker.slot).toBe('test');
        expect(picker.controlDimensions()).toEqual(['policy']);
        expect(picker.excluded()).toEqual(['t1']);
        picker.onPicked({ id: 't9', label: 'T-DOC-009' });
        expect(api.link).toHaveBeenCalledOnceWith('control', 'k1', 'tests', { test_id: 't9' });
        expect(changed).toBe(1);
    });

    it('links required evidence at the position asked for, or at the end when none is given', () => {
        setup('controls', CONTROL);
        click('[data-add="template"]');
        fixture.componentInstance.sequence = '1';
        fixture.componentInstance.onPicked({ id: 'e9', label: 'DOC-9' });
        fixture.detectChanges();
        expect(api.link).toHaveBeenCalledWith('control', 'k1', 'evidence-templates', { evidence_template_id: 'e9', sequence: 1 });
        click('[data-add="template"]');
        fixture.componentInstance.onPicked({ id: 'e8', label: 'DOC-8' });
        expect(api.link.calls.mostRecent().args[3]).toEqual({ evidence_template_id: 'e8' });
    });

    it('links a point of focus, a cause and a dimension from a control', () => {
        setup('controls', CONTROL);
        click('[data-add="pof"]');
        expect(fixture.componentInstance.excluded()).toEqual(['CC1.1#1']);
        fixture.componentInstance.onPicked({ id: 'p9', label: 'CC1.1#2' });
        expect(api.link).toHaveBeenCalledWith('control', 'k1', 'points-of-focus', { point_of_focus_id: 'p9' });
        click('[data-add="cause"]');
        fixture.componentInstance.onPicked({ id: 'c9', label: 'F009' });
        // la causa se vincula desde su lado: `POST /causes/{causa}/controls`
        expect(api.link).toHaveBeenCalledWith('cause', 'c9', 'controls', { control_id: 'k1' });
        click('[data-add="dimension"]');
        pickOption(el(), '[data-dim-dimension]', 'server', () => fixture.detectChanges());
        click('[data-dim-save]');
        expect(api.link).toHaveBeenCalledWith('control', 'k1', 'dimensions', jasmine.objectContaining({ dimension: 'server', type: 'manual' }));
    });

    it('removes a link with the id of the other side, never deleting the elements', () => {
        setup('controls', CONTROL);
        click('[data-unlink="p1"]');
        expect(api.unlink).toHaveBeenCalledWith('control', 'k1', 'points-of-focus', 'p1');
        click('[data-unlink="t1"]');
        expect(api.unlink).toHaveBeenCalledWith('control', 'k1', 'tests', 't1');
        click('[data-unlink="e1"]');
        expect(api.unlink).toHaveBeenCalledWith('control', 'k1', 'evidence-templates', 'e1');
        click('[data-unlink="policy"]');
        expect(api.unlink).toHaveBeenCalledWith('control', 'k1', 'dimensions', 'policy');
        click('[data-unlink="c1"]');
        expect(api.unlink).toHaveBeenCalledWith('cause', 'c1', 'controls', 'k1');
        expect(api.deactivate).not.toHaveBeenCalled();
    });

    it('links a risk with a cause from either side', () => {
        setup('risks', RISK);
        click('[data-add="cause"]');
        fixture.componentInstance.onPicked({ id: 'c9', label: 'F009' });
        expect(api.link).toHaveBeenCalledWith('risk', 'r1', 'causes', { cause_id: 'c9' });
        click('[data-unlink="c1"]');
        expect(api.unlink).toHaveBeenCalledWith('risk', 'r1', 'causes', 'c1');
    });

    it('links a cause with risks and controls', () => {
        setup('causes', CAUSE);
        click('[data-add="risk"]');
        fixture.componentInstance.onPicked({ id: 'r9', label: 'R009' });
        expect(api.link).toHaveBeenCalledWith('risk', 'r9', 'causes', { cause_id: 'c1' });
        click('[data-add="control"]');
        fixture.componentInstance.onPicked({ id: 'k9', label: 'CTL-9' });
        expect(api.link).toHaveBeenCalledWith('cause', 'c1', 'controls', { control_id: 'k9' });
        click('[data-unlink="r1"]');
        expect(api.unlink).toHaveBeenCalledWith('risk', 'r1', 'causes', 'c1');
        click('[data-unlink="k1"]');
        expect(api.unlink).toHaveBeenCalledWith('cause', 'c1', 'controls', 'k1');
    });

    it('shows a required evidence with its description and how many controls ask for it, and can edit or retire it', () => {
        setup('evidence-templates', TEMPLATE);
        expect(el().textContent).toContain('Acta de la revisión');
        expect(el().querySelector('[data-edit]')).not.toBeNull();
        click('[data-edit]');
        expect(edits[0]).toEqual(jasmine.objectContaining({ kind: 'template', id: 'e1' }));
    });

    it('does not offer to link a test from the test itself: a test is linked from the control that uses it', () => {
        setup('tests', TEST);
        expect(el().querySelector('[data-add]')).toBeNull();
        expect(el().querySelector('[data-unlink]')).toBeNull();
    });

    it('opens one slot at a time and clears it when another element is shown', () => {
        setup('controls', CONTROL);
        click('[data-add="test"]');
        click('[data-add="template"]');
        expect(fixture.componentInstance.slot).toBe('template');
        fixture.componentInstance.cancelPick();
        expect(fixture.componentInstance.slot).toBeNull();
    });
});
