import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { InvitedAdmin } from '@features/admin-users/models/admin-user.model';
import { Busy } from '@shared/presentation/directives/busy';
import { StatusIndicator } from '@shared/presentation/components/status-indicator/status-indicator';
import { LocalDatePipe } from '@shared/presentation/pipes/local-date.pipe';

// Lo que pasó con el correo de la invitación (`sent` o `failed`). Nunca muestra el código: va solo por correo. Si no salió, se reenvía.
@Component({
  selector: 'app-admin-invite-result',
  imports: [TranslatePipe, LocalDatePipe, Busy, StatusIndicator],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div role="status" data-testid="admin-invite-result">
      <h2 id="admin-invite-result-title" class="text-lg font-semibold text-ink">{{ (sent() ? 'ADMIN_USERS.RESULT.SENT_TITLE' : 'ADMIN_USERS.RESULT.FAILED_TITLE') | translate }}</h2>
      <p class="mt-2 text-sm text-ink-muted">{{ (sent() ? 'ADMIN_USERS.RESULT.SENT_BODY' : 'ADMIN_USERS.RESULT.FAILED_BODY') | translate: { email: admin().email } }}</p>
      <div class="mt-3 flex flex-wrap items-center gap-3">
        <app-status-indicator [tone]="sent() ? 'ok' : 'bad'" [labelKey]="sent() ? 'ADMIN_USERS.RESULT.STATUS_SENT' : 'ADMIN_USERS.RESULT.STATUS_FAILED'" />
        @if (sent() && admin().invitation.expires_at) {
          <span class="text-xs text-ink-muted">{{ 'ADMIN_USERS.RESULT.EXPIRES' | translate: { date: (admin().invitation.expires_at | localDate: 'medium') } }}</span>
        }
      </div>
      @if (!sent()) {
        <button type="button" class="mt-4 mk-btn-secondary" [appBusy]="resending()" (click)="resend.emit()" data-testid="admin-invite-resend">{{ 'ADMIN_USERS.RESULT.RESEND' | translate }}</button>
      }
    </div>
  `,
})
export class AdminInviteResult {
  readonly admin = input.required<InvitedAdmin>();
  readonly resending = input(false);
  readonly resend = output<void>();

  protected sent(): boolean {
    return this.admin().invitation.delivery_status === 'sent';
  }
}
