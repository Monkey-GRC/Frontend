import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { Company, RegisteredCompany } from '@shared/models/company.model';
import { CompanyService } from '@features/companies/services/company.service';
import { ToastService } from '@shared/presentation/components/toast-container/toast.service';
import { Companies } from './companies';

const COMPANY = { id: 'co-1', name: 'ACME', admin_email: 'a@acme.co', max_users: 10, users_count: 4, archive_until: '2026-12-01T00:00:00Z' } as Company;

// Los formularios de Empresas viven en `app-form-modal`: Esc y el clic fuera no pierden un formulario sucio ni cierran mientras se envía, el botón no se puede pulsar dos veces,
// archivar y reactivar siguen pidiendo el segundo factor, y el foco vuelve a quien abrió el modal.
describe('Companies · formularios en modales', () => {
  let fixture: ComponentFixture<Companies>;
  let page: Companies;
  let http: HttpTestingController;
  let service: CompanyService;
  let opener: HTMLButtonElement;

  const q = <T extends HTMLElement>(id: string) => (fixture.nativeElement as HTMLElement).querySelector<T>(`[data-testid="${id}"]`);
  const tick = async () => {
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve));
    fixture.detectChanges();
  };
  const escape = () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
  const clickOutside = () => q('company-form-backdrop')?.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [Companies],
      providers: [
        provideTranslateService(),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ToastService, useValue: jasmine.createSpyObj<ToastService>('ToastService', ['showSuccess', 'showError', 'showWarning', 'showInfo']) },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    service = TestBed.inject(CompanyService);
    opener = document.createElement('button');
    document.body.appendChild(opener);
    fixture = TestBed.createComponent(Companies);
    page = fixture.componentInstance;
    fixture.detectChanges();
    http.match(() => true).forEach((r) => r.flush({ data: { items: [], page: 1, total: 0, total_pages: 1 } }));
    await tick();
  });

  afterEach(() => {
    opener.remove();
    document.body.classList.remove('overflow-hidden');
  });

  describe('registro de empresa', () => {
    const openForm = async () => {
      opener.focus();
      page.onOpenForm();
      await tick();
      http.match(() => true).forEach((r) => r.flush({ data: { items: [] } }));
    };

    it('with data written, Escape, a click outside and Cancel ask before discarding: «Seguir editando» keeps it, «Descartar cambios» closes (MD-485)', async () => {
      await openForm();
      service.form.get('name')?.setValue('Nueva');
      await tick();
      const confirm = () => document.querySelector<HTMLElement>('[role="alertdialog"]');
      for (const close of [escape, clickOutside, () => q<HTMLButtonElement>('company-form-cancel')?.click()]) {
        close();
        await tick();
        expect(page.isFormVisible).toBeTrue();
        expect(confirm()).withContext('the confirmation opens').not.toBeNull();
        confirm()!.querySelector<HTMLButtonElement>('[data-cancel]')!.click();
        await tick();
        expect(confirm()).toBeNull();
        expect(page.isFormVisible).toBeTrue();
        expect(service.form.get('name')?.value).toBe('Nueva');
      }
      q<HTMLButtonElement>('company-form-cancel')?.click();
      await tick();
      confirm()!.querySelector<HTMLButtonElement>('[data-confirm]')!.click();
      await tick();
      expect(page.isFormVisible).toBeFalse();
    });

    it('typing and erasing back is not a change: Cancel closes without asking', async () => {
      await openForm();
      service.form.get('name')?.setValue('Nueva');
      service.form.get('name')?.setValue('');
      await tick();
      q<HTMLButtonElement>('company-form-cancel')?.click();
      await tick();
      expect(document.querySelector('[role="alertdialog"]')).toBeNull();
      expect(page.isFormVisible).toBeFalse();
    });

    it('a clean form closes with Escape and focus returns to what opened it', async () => {
      await openForm();
      expect(q('company-form-dialog')?.getAttribute('role')).toBe('dialog');
      escape();
      await tick();
      expect(page.isFormVisible).toBeFalse();
      expect(document.activeElement).toBe(opener);
    });

    it('while it sends, the buttons are disabled and Escape does not close it', async () => {
      await openForm();
      const form = page.companyForm;
      if (!form) throw new Error('form not mounted');
      form.sendingForm = true;
      await tick();
      const submit = q<HTMLButtonElement>('company-form-submit');
      expect(submit?.getAttribute('aria-busy')).toBe('true');
      expect(submit?.getAttribute('aria-disabled')).toBe('true');
      expect(submit?.hasAttribute('data-app-busy')).toBeTrue();
      expect(q<HTMLButtonElement>('company-form-cancel')?.disabled).toBeTrue();
      escape();
      await tick();
      expect(page.isFormVisible).toBeTrue();
    });
  });

  describe('cupo', () => {
    it('does not close with Escape once the quota was edited, and disables saving while sending', async () => {
      opener.focus();
      page.onOpenQuota(COMPANY);
      await tick();
      const quota = page.quotaForm;
      if (!quota) throw new Error('form not mounted');
      quota.form.controls.max_users.setValue(20);
      quota.form.controls.max_users.markAsDirty();
      await tick();
      escape();
      await tick();
      expect(page.changingQuota).toBe(COMPANY);
      page.quotaSending = true;
      await tick();
      const submit = q<HTMLButtonElement>('company-quota-submit');
      expect(submit?.getAttribute('aria-busy')).toBe('true');
      expect(submit?.getAttribute('aria-disabled')).toBe('true');
      expect(submit?.hasAttribute('data-app-busy')).toBeTrue();
    });
  });

  describe('aviso de la clave (D99)', () => {
    const registered = (delivery: 'sent' | 'failed') =>
      ({ ...COMPANY, isolation_strategy: 'shared', status: 'active', frameworks: [], access_key: { id: 'k1', status: 'active', expires_at: '2026-12-01T00:00:00Z', delivery_status: delivery } }) as unknown as RegisteredCompany;

    it('when the e-mail went out, the title says so, there is nothing to resend and the footer button closes it', async () => {
      page.registered = registered('sent');
      await tick();
      expect(q('company-key-dialog')?.querySelector('h2')?.textContent).toContain('COMPANIES_MODULE.KEY.TITLE');
      expect(q('key-resend')).toBeNull();
      q<HTMLButtonElement>('company-key-cancel')?.click();
      await tick();
      expect(page.registered).toBeNull();
    });

    it('when it failed, the title says so, resending is the footer action and the notice does not close while it resends', async () => {
      page.registered = registered('failed');
      await tick();
      expect(q('company-key-dialog')?.querySelector('h2')?.textContent).toContain('COMPANIES_MODULE.KEY.FAILED_TITLE');
      expect(q('key-resend')?.closest('footer')).not.toBeNull();
      page.resendingKey = true;
      await tick();
      expect(q('key-resend')?.getAttribute('aria-busy')).toBe('true');
      expect(q<HTMLButtonElement>('company-key-cancel')?.disabled).toBeTrue();
      escape();
      await tick();
      expect(page.registered).not.toBeNull();
    });
  });

  describe('archivar y reactivar', () => {
    it('archive asks for the second factor after approving the form and sends nothing yet', async () => {
      opener.focus();
      page.archiving = COMPANY;
      await tick();
      const archive = page.archiveForm;
      if (!archive) throw new Error('form not mounted');
      expect(q<HTMLButtonElement>('company-archive-submit')?.disabled).toBeTrue();
      archive.form.patchValue({ confirm_name: 'ACME', reason: 'Fin del contrato' });
      archive.form.markAsDirty();
      await tick();
      escape();
      await tick();
      expect(page.archiving).toBe(COMPANY);
      q<HTMLButtonElement>('company-archive-submit')?.click();
      await tick();
      expect(page.stepUp?.kind).toBe('archive');
      expect(page.archiving).toBeNull();
      http.expectNone((r) => r.method !== 'GET');
    });

    it('reactivate asks for the second factor after approving the form and sends nothing yet', async () => {
      page.reactivating = COMPANY;
      await tick();
      const reactivate = page.reactivateForm;
      if (!reactivate) throw new Error('form not mounted');
      expect(q<HTMLButtonElement>('company-reactivate-submit')?.disabled).toBeTrue();
      reactivate.form.patchValue({ reason: 'Contrato renovado' });
      await tick();
      q<HTMLButtonElement>('company-reactivate-submit')?.click();
      await tick();
      expect(page.stepUp?.kind).toBe('reactivate');
      expect(page.reactivating).toBeNull();
      http.expectNone((r) => r.method !== 'GET');
    });
  });
});
