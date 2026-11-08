import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { Company } from '@features/companies/models/company.model';
import { CompanyQuotaForm } from './company-quota-form';

const company = (over: Partial<Company> = {}) => ({ id: 'co-1', name: 'ACME', max_users: 10, users_count: 4, ...over }) as Company;

// D103 · El formulario de «Cambiar cupo»: el servidor es quien manda (409), pero aquí se avisa antes de enviar.
describe('CompanyQuotaForm', () => {
  let fixture: ComponentFixture<CompanyQuotaForm>;
  let form: CompanyQuotaForm;

  function open(c: Company | null = company()) {
    TestBed.configureTestingModule({ imports: [CompanyQuotaForm], providers: [provideTranslateService()] });
    fixture = TestBed.createComponent(CompanyQuotaForm);
    fixture.componentRef.setInput('company', c);
    fixture.detectChanges();
    form = fixture.componentInstance;
  }
  const type = (value: number | null) => {
    form.form.controls.max_users.setValue(value);
    fixture.detectChanges();
  };
  const q = (selector: string) => (fixture.nativeElement as HTMLElement).querySelector(selector);

  it('starts from the current quota, which is not a change yet', () => {
    open();
    expect(form.form.controls.max_users.value).toBe(10);
    expect(form.canSubmit).toBeFalse();
  });

  it('a company without a limit (older than the quota) starts empty', () => {
    open(company({ max_users: null }));
    expect(form.form.controls.max_users.value).toBeNull();
    expect(form.canSubmit).toBeFalse();
    type(8);
    expect(form.canSubmit).toBeTrue();
  });

  it('allows a quota equal to or above the accounts that already count', () => {
    open();
    type(4);
    expect(form.canSubmit).toBeTrue();
    type(25);
    expect(form.canSubmit).toBeTrue();
  });

  it('blocks a quota below the accounts that already count and says the minimum', () => {
    open();
    type(3);
    expect(form.canSubmit).toBeFalse();
    expect(q('[data-testid="quota-below-current"]')).not.toBeNull();
    expect(form.minAllowed).toBe(4);
  });

  it('never allows less than 1, even when nobody counts yet', () => {
    open(company({ users_count: 0 }));
    expect(form.minAllowed).toBe(1);
    type(0);
    expect(form.canSubmit).toBeFalse();
    type(-2);
    expect(form.canSubmit).toBeFalse();
    type(2.5);
    expect(form.canSubmit).toBeFalse();
  });

  it('emits the new quota as a number', () => {
    open();
    const sent: number[] = [];
    form.approved.subscribe((v) => sent.push(v));
    form.form.controls.max_users.setValue('30' as unknown as number); // el campo numérico puede entregar texto
    form.onSubmit();
    expect(sent).toEqual([30]);
  });

  it('emits nothing when it cannot be submitted', () => {
    open();
    const sent: number[] = [];
    form.approved.subscribe((v) => sent.push(v));
    type(1);
    form.onSubmit();
    expect(sent).toEqual([]);
  });

  it('shows the reason the server gave, inside the dialog', () => {
    open();
    fixture.componentRef.setInput('error', 'El cupo no puede ser menor que las 4 cuentas que ya cuentan.');
    fixture.detectChanges();
    expect(q('[data-testid="quota-error"]')?.textContent).toContain('4 cuentas');
  });

  it('starts over with each company', () => {
    open();
    type(99);
    fixture.componentRef.setInput('company', company({ id: 'co-2', max_users: 5 }));
    fixture.detectChanges();
    expect(form.form.controls.max_users.value).toBe(5);
  });
});
