import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { AdminUser } from '@features/admin-users/models/admin-user.model';
import { AdminUserList } from './admin-user-list';

const admin = (over: Partial<AdminUser> = {}): AdminUser => ({
  id: 'a1', email: 'ana@monkey.example', name: 'Ana', last_name: 'Ruiz', role: 'admin_monkey', status: 'active', is_mfa_enabled: true, last_login_at: null, created_at: '2026-10-01T00:00:00Z',
  invited_by: null, purge_at: null, ...over,
});

describe('AdminUserList', () => {
  let fixture: ComponentFixture<AdminUserList>;

  function show(rows: AdminUser[], currentUserId: string | null = 'me') {
    TestBed.configureTestingModule({ imports: [AdminUserList], providers: [provideTranslateService()] });
    fixture = TestBed.createComponent(AdminUserList);
    fixture.componentRef.setInput('rows', rows);
    fixture.componentRef.setInput('page', { page: 1, pageSize: 25, total: rows.length, totalPages: 1 });
    fixture.componentRef.setInput('currentUserId', currentUserId);
    fixture.detectChanges();
  }
  const q = (id: string) => fixture.nativeElement.querySelectorAll(`[data-testid="${id}"]`) as NodeListOf<HTMLButtonElement>;

  it('offers each action only where it applies: resend to pending, deactivate to active others, reactivate to inactive', () => {
    show([admin({ id: 'p', status: 'pending' }), admin({ id: 'ok' }), admin({ id: 'me' }), admin({ id: 'off', status: 'inactive', purge_at: '2999-01-01T00:00:00Z' })]);
    expect(q('admin-resend').length).toBe(1);
    expect(q('admin-deactivate').length).toBe(1); // not on yourself, not on pending or inactive
    expect(q('admin-reactivate').length).toBe(1);
  });

  it('emits the row that was pressed', () => {
    show([admin({ id: 'x' }), admin({ id: 'y' })]);
    const asked: string[] = [];
    fixture.componentInstance.deactivate.subscribe((a) => asked.push(a.id));
    q('admin-deactivate')[1].click();
    expect(asked).toEqual(['y']);
  });

  it('shows the countdown of a deactivated account and the stamp of an inviter who no longer exists', () => {
    show([admin({ id: 'off', status: 'inactive', purge_at: new Date(Date.now() + 3 * 86_400_000).toISOString(), invited_by: { id: 'g', name: 'Rod', last_name: 'Ríos', purged: true } })]);
    expect(fixture.nativeElement.querySelector('[data-testid="admin-countdown"]').textContent).toContain('ADMIN_USERS.PURGE.DAYS');
    expect(fixture.nativeElement.querySelector('[data-testid="admin-inviter-purged"]')).not.toBeNull();
  });

  it('says it failed and lets the person retry', () => {
    show([]);
    fixture.componentRef.setInput('failed', true);
    fixture.detectChanges();
    let retried = false;
    fixture.componentInstance.retry.subscribe(() => (retried = true));
    (fixture.nativeElement.querySelector('[data-testid="admin-list-retry"]') as HTMLButtonElement).click();
    expect(retried).toBeTrue();
  });
});
