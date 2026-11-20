import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { InvitedAdmin } from '@features/admin-users/models/admin-user.model';
import { StatusIndicator } from '@shared/presentation/components/status-indicator/status-indicator';
import { LocalDatePipe } from '@shared/presentation/pipes/local-date.pipe';

// Lo que pasó con el correo de la invitación (`sent` o `failed`). Nunca muestra el código: va solo por correo. El título y el botón de reenviar (si no salió)
// los pone el modal de la vista, que hace la llamada.
@Component({
  selector: 'app-admin-invite-result',
  imports: [TranslatePipe, LocalDatePipe, StatusIndicator],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div role="status" data-testid="admin-invite-result">
      <p class="text-sm text-ink-muted">{{ (sent() ? 'ADMIN_USERS.RESULT.SENT_BODY' : 'ADMIN_USERS.RESULT.FAILED_BODY') | translate: { email: admin().email } }}</p>
      <div class="mt-3 flex flex-wrap items-center gap-3">
        <app-status-indicator [tone]="sent() ? 'ok' : 'bad'" [labelKey]="sent() ? 'ADMIN_USERS.RESULT.STATUS_SENT' : 'ADMIN_USERS.RESULT.STATUS_FAILED'" />
        @if (sent() && admin().invitation.expires_at) {
          <span class="text-xs text-ink-muted tabular-nums">{{ 'ADMIN_USERS.RESULT.EXPIRES' | translate: { date: (admin().invitation.expires_at | localDate: 'medium') } }}</span>
        }
      </div>
    </div>
  `,
})
export class AdminInviteResult {
  readonly admin = input.required<InvitedAdmin>();

  protected sent(): boolean {
    return this.admin().invitation.delivery_status === 'sent';
  }
}
