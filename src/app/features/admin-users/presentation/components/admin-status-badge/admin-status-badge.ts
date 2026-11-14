import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { AdminUser } from '@features/admin-users/models/admin-user.model';
import { daysUntilPurge } from '@features/admin-users/services/admin-user.utils';
import { StatusIndicator, StatusTone } from '@shared/presentation/components/status-indicator/status-indicator';

const TONES: Record<AdminUser['status'], StatusTone> = { active: 'ok', pending: 'info', inactive: 'warn' };

// El estado de un administrador: activo, pendiente de activar o desactivado (con la cuenta atrás «se borra en N días»).
@Component({
  selector: 'app-admin-status-badge',
  imports: [TranslatePipe, StatusIndicator],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col items-start gap-1' },
  template: `
    <app-status-indicator [tone]="tone()" [labelKey]="'ADMIN_USERS.STATUS.' + admin().status" />
    @if (countdownKey(); as key) {
      <span class="text-xs" [class]="urgent() ? 'font-semibold text-bad-ink' : 'text-ink-muted'" data-testid="admin-countdown">{{ key | translate: { days: days() } }}</span>
    }
  `,
})
export class AdminStatusBadge {
  readonly admin = input.required<AdminUser>();

  protected readonly tone = computed<StatusTone>(() => TONES[this.admin().status] ?? 'neutral');
  protected readonly days = computed(() => daysUntilPurge(this.admin().purge_at));
  protected readonly urgent = computed(() => (this.days() ?? 99) <= 2);
  protected readonly countdownKey = computed(() => {
    const days = this.days();
    if (this.admin().status !== 'inactive' || days === null) return null;
    return days === 0 ? 'ADMIN_USERS.PURGE.TODAY' : days === 1 ? 'ADMIN_USERS.PURGE.ONE_DAY' : 'ADMIN_USERS.PURGE.DAYS';
  });
}
