import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { Company, DEACTIVATION_REASONS } from '@shared/models/company.model';
import { optionValues, pickOption, selectText } from '@shared/presentation/components/select/select.testing';
import { ArchiveDetails, CompanyArchiveForm } from './company-archive-form';

describe('CompanyArchiveForm', () => {
  let fixture: ComponentFixture<CompanyArchiveForm>;
  let approved: ArchiveDetails[];
  const el = () => fixture.nativeElement as HTMLElement;
  const detect = () => fixture.detectChanges();

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [CompanyArchiveForm], providers: [provideTranslateService()] });
    fixture = TestBed.createComponent(CompanyArchiveForm);
    fixture.componentRef.setInput('company', { id: 'c1', name: 'ACME' } as unknown as Company);
    approved = [];
    fixture.componentInstance.approved.subscribe((a) => approved.push(a));
    detect();
  });

  const type = (selector: string, value: string) => {
    const input = el().querySelector<HTMLInputElement | HTMLTextAreaElement>(selector)!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    detect();
  };

  it('offers every deactivation reason in the system select, with the first one chosen', () => {
    expect(selectText(el(), '#archive-reason-code')).toContain('COMPANIES_MODULE.ARCHIVE.REASON.' + DEACTIVATION_REASONS[0]);
    expect(optionValues(el(), '#archive-reason-code', detect)).toEqual([...DEACTIVATION_REASONS]);
    expect(el().querySelector('select')).toBeNull();
  });

  it('sends the reason that was chosen with the other details', () => {
    pickOption(el(), '#archive-reason-code', DEACTIVATION_REASONS[1], detect);
    type('#archive-reason', 'El contrato terminó');
    type('#archive-confirm', 'ACME');
    fixture.componentInstance.onSubmit();
    expect(approved.length).toBe(1);
    expect(approved[0].reason_code).toBe(DEACTIVATION_REASONS[1]);
    expect(approved[0].reason).toBe('El contrato terminó');
  });
});
