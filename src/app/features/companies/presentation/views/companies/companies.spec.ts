import { TranslateService } from '@ngx-translate/core';
import { of, throwError } from 'rxjs';
import { Company } from '@features/companies/models/company.model';
import { CompanyService } from '@features/companies/services/company.service';
import { ArchiveDetails } from '@features/companies/presentation/components/company-archive-form/company-archive-form';
import { ReactivateDetails } from '@features/companies/presentation/components/company-reactivate-form/company-reactivate-form';
import { ToastService } from '@shared/services/toast.service';
import { Companies } from './companies';

// D94, D97: archivar y reactivar una empresa piden, ya aprobado el formulario, el código del segundo factor. Es el modal genérico de verificación; aquí se prueba el flujo que lo
// maneja (sin dibujar la pantalla): qué se envía, qué pasa si el servidor rechaza el código y cuándo se cierra.
const COMPANY = { id: 'co-1', name: 'ACME' } as Company;
const ARCHIVE = { confirm_name: 'ACME', reason_code: 'contract_ended', reason: 'Fin del contrato', retention_days: 180 } as unknown as ArchiveDetails;
const REACTIVATE = { confirm_name: 'ACME' } as unknown as ReactivateDetails;
const answer = { data: { name: 'ACME', archive_until: null } };
// Los servicios están tipados con el sobre completo de la API; aquí solo importa lo que la pantalla lee.
const reply = (value: unknown) => of(value) as never;
const fail = (message: string) => throwError(() => new Error(message)) as never;

describe('Companies · segunda confirmación con el modal genérico', () => {
  let service: jasmine.SpyObj<CompanyService>;
  let toast: jasmine.SpyObj<ToastService>;
  let page: Companies;

  beforeEach(() => {
    service = Object.assign(jasmine.createSpyObj<CompanyService>('CompanyService', ['archiveCompany', 'reactivateCompany', 'readCompanies']), { companies: [] as Company[] });
    service.readCompanies.and.returnValue(reply({ data: { items: [], page: 1, total: 0, total_pages: 1 } }));
    toast = jasmine.createSpyObj<ToastService>('ToastService', ['showSuccess', 'showError']);
    page = new Companies(service, toast, { instant: (key: string) => key } as unknown as TranslateService);
  });

  const startArchive = () => {
    page.archiving = COMPANY;
    page.onArchiveApproved(ARCHIVE);
  };

  it('opens the code modal as soon as the archive form is approved, and nothing is sent yet', () => {
    startArchive();
    expect(page.stepUp?.kind).toBe('archive');
    expect(page.archiving).toBeNull();
    expect(service.archiveCompany).not.toHaveBeenCalled();
  });

  it('sends what was approved together with the code, then closes and reloads the list', () => {
    service.archiveCompany.and.returnValue(reply(answer));
    startArchive();
    page.onStepUpConfirmed({ code: '123456' });
    expect(service.archiveCompany).toHaveBeenCalledOnceWith('co-1', { ...ARCHIVE, totp_code: '123456' });
    expect(toast.showSuccess).toHaveBeenCalledTimes(1);
    expect(page.stepUp).toBeNull();
    expect(page.stepUpSending).toBeFalse();
    expect(service.readCompanies).toHaveBeenCalled();
  });

  it('reactivates through its own endpoint with the same modal', () => {
    service.reactivateCompany.and.returnValue(reply(answer));
    page.reactivating = COMPANY;
    page.onReactivateApproved(REACTIVATE);
    expect(page.stepUp?.kind).toBe('reactivate');
    page.onStepUpConfirmed({ code: '654321' });
    expect(service.reactivateCompany).toHaveBeenCalledOnceWith('co-1', { ...REACTIVATE, totp_code: '654321' });
    expect(service.archiveCompany).not.toHaveBeenCalled();
    expect(page.stepUp).toBeNull();
  });

  it('keeps the modal open with the reason when the server rejects the code, so another can be typed', () => {
    service.archiveCompany.and.returnValue(fail('Ese código no es correcto.'));
    startArchive();
    page.onStepUpConfirmed({ code: '000000' });
    expect(page.stepUp?.kind).toBe('archive');
    expect(page.stepUpError).toBe('Ese código no es correcto.');
    expect(page.stepUpSending).toBeFalse();
    expect(toast.showSuccess).not.toHaveBeenCalled();
    expect(service.readCompanies).not.toHaveBeenCalled();
  });

  it('clears the previous error when the person tries again', () => {
    service.archiveCompany.and.returnValues(fail('Ese código no es correcto.'), reply(answer));
    startArchive();
    page.onStepUpConfirmed({ code: '000000' });
    page.onStepUpConfirmed({ code: '111111' });
    expect(page.stepUpError).toBeNull();
    expect(page.stepUp).toBeNull();
  });

  it('does not send a recovery code (it is not accepted for this action)', () => {
    startArchive();
    page.onStepUpConfirmed({ recovery_code: 'K7QWM-3PZ9T' });
    expect(service.archiveCompany).not.toHaveBeenCalled();
  });

  it('cancelling forgets what was approved and any error', () => {
    startArchive();
    page.stepUpError = 'algo';
    page.closeStepUp();
    expect(page.stepUp).toBeNull();
    expect(page.stepUpError).toBeNull();
  });
});

// D103 · Cambiar el cupo de usuarios de una empresa (MD-205).
describe('Companies · cambiar el cupo de usuarios', () => {
  let service: jasmine.SpyObj<CompanyService>;
  let toast: jasmine.SpyObj<ToastService>;
  let page: Companies;
  const acme = { id: 'co-1', name: 'ACME', max_users: 10, users_count: 4 } as Company;
  const rejected = (code: string, details: object, message = 'mensaje del servidor') => throwError(() => Object.assign(new Error(message), { status: 409, code, details })) as never;

  beforeEach(() => {
    service = Object.assign(jasmine.createSpyObj<CompanyService>('CompanyService', ['updateMaxUsers', 'readCompanies']), { companies: [] as Company[], page: 2 });
    service.readCompanies.and.returnValue(reply({ data: { items: [], page: 2, total: 0, total_pages: 3 } }));
    toast = jasmine.createSpyObj<ToastService>('ToastService', ['showSuccess', 'showError']);
    page = new Companies(service, toast, { instant: (key: string, params?: object) => key + (params ? JSON.stringify(params) : '') } as unknown as TranslateService);
  });

  it('opens with no previous error and sends the new quota for THAT company', () => {
    service.updateMaxUsers.and.returnValue(reply({ data: { ...acme, max_users: 25 } }));
    page.quotaError = 'viejo';
    page.onOpenQuota(acme);
    expect(page.changingQuota).toBe(acme);
    expect(page.quotaError).toBeNull();
    page.onQuotaApproved(25);
    expect(service.updateMaxUsers).toHaveBeenCalledOnceWith('co-1', 25);
  });

  it('on success tells it, closes the dialog and reloads the SAME page of the list', () => {
    service.updateMaxUsers.and.returnValue(reply({ data: acme }));
    page.onOpenQuota(acme);
    page.onQuotaApproved(25);
    expect(toast.showSuccess).toHaveBeenCalledTimes(1);
    expect(page.changingQuota).toBeNull();
    expect(page.quotaSending).toBeFalse();
    expect(service.readCompanies).toHaveBeenCalledWith(2);
  });

  it('when the quota is lower than what already counts (409) it stays open and says the number', () => {
    service.updateMaxUsers.and.returnValue(rejected('MAX_USERS_BELOW_CURRENT', { max_users: 2, users_count: 4 }));
    page.onOpenQuota(acme);
    page.onQuotaApproved(2);
    expect(page.changingQuota).toBe(acme);
    expect(page.quotaError).toContain('BELOW_CURRENT_SERVER');
    expect(page.quotaError).toContain('"count":4');
    expect(page.quotaSending).toBeFalse();
    expect(toast.showSuccess).not.toHaveBeenCalled();
    expect(service.readCompanies).not.toHaveBeenCalled();
  });

  it('any other failure also stays open, with the reason the server gave', () => {
    service.updateMaxUsers.and.returnValue(rejected('INTERNAL_ERROR', {}, 'No se pudo guardar.'));
    page.onOpenQuota(acme);
    page.onQuotaApproved(20);
    expect(page.quotaError).toBe('No se pudo guardar.');
    expect(page.changingQuota).toBe(acme);
  });

  it('forgets the company and the error when it is closed, but not while it is saving', () => {
    page.onOpenQuota(acme);
    page.quotaError = 'algo';
    page.quotaSending = true;
    page.onCloseQuota();
    expect(page.changingQuota).toBe(acme);
    page.quotaSending = false;
    page.onCloseQuota();
    expect(page.changingQuota).toBeNull();
    expect(page.quotaError).toBeNull();
  });

  it('sends nothing when no company is open', () => {
    page.onQuotaApproved(5);
    expect(service.updateMaxUsers).not.toHaveBeenCalled();
  });
});
