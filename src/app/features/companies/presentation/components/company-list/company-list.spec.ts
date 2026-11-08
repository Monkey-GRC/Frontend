import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { Company } from '@features/companies/models/company.model';
import { CompanyService } from '@features/companies/services/company.service';
import { CompanyList } from './company-list';

const company = (over: Partial<Company> = {}): Company => ({
  id: 'co-1', name: 'ACME', admin_email: 'a@acme.co', isolation_strategy: 'shared', status: 'active', frameworks: [], access_key_status: 'used', access_key_expires_at: null,
  onboarding_completed: true, max_users: 10, users_count: 4, created_at: '2026-10-01T00:00:00Z', deactivated_at: null, archive_until: null, deactivation_reason_code: null, deactivation_reason: null, ...over,
});

// D103 · La lista muestra el cupo junto al uso («4 / 10») y deja cambiarlo.
describe('CompanyList · cupo de usuarios', () => {
  let fixture: ComponentFixture<CompanyList>;

  function show(...companies: Company[]) {
    TestBed.configureTestingModule({ imports: [CompanyList], providers: [provideTranslateService(), provideHttpClient(), provideHttpClientTesting()] });
    TestBed.inject(CompanyService).companies = companies;
    fixture = TestBed.createComponent(CompanyList);
    fixture.detectChanges();
  }
  const cells = () => Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('[data-testid="company-users"]')) as HTMLElement[];

  it('shows the accounts that count and the contracted quota together', () => {
    show(company());
    expect(cells()[0].textContent?.replace(/\s+/g, ' ').trim()).toBe('4 / 10');
    expect(fixture.nativeElement.querySelector('[data-testid="company-quota-full"]')).toBeNull();
  });

  it('says the quota is full when the accounts that count reach it', () => {
    show(company({ users_count: 10 }), company({ id: 'co-2', users_count: 11 }));
    expect(fixture.nativeElement.querySelectorAll('[data-testid="company-quota-full"]').length).toBe(2);
  });

  it('a company older than the quota has no limit and is never "full"', () => {
    show(company({ max_users: null, users_count: 50 }));
    expect(cells()[0].textContent).toContain('COMPANIES_MODULE.LIST.NO_LIMIT');
    expect(fixture.nativeElement.querySelector('[data-testid="company-quota-full"]')).toBeNull();
  });

  it('asks to change the quota of THAT row', () => {
    show(company(), company({ id: 'co-2', name: 'Beta' }));
    const asked: Company[] = [];
    fixture.componentInstance.changeQuota.subscribe((c) => asked.push(c));
    const buttons = fixture.nativeElement.querySelectorAll('[data-testid="company-change-quota"]') as NodeListOf<HTMLButtonElement>;
    buttons[1].click();
    expect(asked.map((c) => c.id)).toEqual(['co-2']);
  });

  it('an archived company cannot have its quota changed', () => {
    show(company({ status: 'deactivated' }));
    expect(fixture.nativeElement.querySelector('[data-testid="company-change-quota"]')).toBeNull();
  });
});
