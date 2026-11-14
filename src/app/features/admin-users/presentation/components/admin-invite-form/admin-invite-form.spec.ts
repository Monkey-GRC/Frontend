import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { InviteAdminData } from '@features/admin-users/models/admin-user.model';
import { AdminInviteForm } from './admin-invite-form';

describe('AdminInviteForm', () => {
  let fixture: ComponentFixture<AdminInviteForm>;
  let sent: InviteAdminData[];

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [AdminInviteForm], providers: [provideTranslateService()] });
    fixture = TestBed.createComponent(AdminInviteForm);
    sent = [];
    fixture.componentInstance.invited.subscribe((b) => sent.push(b));
    fixture.detectChanges();
  });

  it('does not send an incomplete form', () => {
    const c = fixture.componentInstance;
    c.submit();
    fixture.detectChanges();
    expect(sent.length).toBe(0);
    c.form.patchValue({ email: 'not-an-email', name: 'Ana', last_name: 'Ruiz' });
    c.submit();
    expect(sent.length).toBe(0);
  });

  it('emits the form data: lower-case email and the admin_monkey role (the code is asked later by the dialog)', () => {
    const c = fixture.componentInstance;
    c.form.patchValue({ email: ' Ana@Monkey.Example ', name: ' Ana ', last_name: 'Ruiz' });
    c.submit();
    expect(sent).toEqual([{ email: 'ana@monkey.example', name: 'Ana', last_name: 'Ruiz', role: 'admin_monkey' }]);
  });

  it('shows the server error of a repeated email next to the field', () => {
    fixture.componentRef.setInput('fieldErrors', { email: 'ADMIN_USERS.ERRORS.EMAIL_TAKEN' });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-testid="admin-email-server-error"]')).not.toBeNull();
  });
});
