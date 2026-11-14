import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { finalize } from 'rxjs';
import { AuthService } from '@core/services/auth.service';
import { AdminListQuery, AdminSort, AdminStatus, AdminUser, InviteAdminData, InvitedAdmin } from '@features/admin-users/models/admin-user.model';
import { AdminUserService } from '@features/admin-users/services/admin-user.service';
import { adminErrorKey } from '@features/admin-users/services/admin-user.utils';
import { AdminInviteForm } from '@features/admin-users/presentation/components/admin-invite-form/admin-invite-form';
import { AdminInviteResult } from '@features/admin-users/presentation/components/admin-invite-result/admin-invite-result';
import { AdminUserList } from '@features/admin-users/presentation/components/admin-user-list/admin-user-list';
import { unwrapData } from '@shared/domain/utils/unwrap-response';
import { ConfirmDialog } from '@shared/presentation/components/confirm-dialog/confirm-dialog';
import { FormModal } from '@shared/presentation/components/form-modal/form-modal';
import { Modal } from '@shared/presentation/components/modal/modal';
import { PageInfo } from '@shared/presentation/components/data-table/table-page';
import { SecondFactorAnswer, SecondFactorDialog } from '@shared/presentation/components/second-factor-dialog/second-factor-dialog';
import { ToastService } from '@shared/presentation/components/toast-container/toast.service';
import { Busy } from '@shared/presentation/directives/busy';
import { TranslatePipe } from '@ngx-translate/core';

type ServerError = Error & { code?: string; fields?: { field: string; message: string }[] };

const PAGE_SIZE = 25;

// Administradores de Monkey (MD-215, D117): invitar, reenviar la invitación, desactivar (7 días de gracia) y reactivar. La vista guarda el estado y llama al servicio;
// la tabla, el formulario y el aviso del envío son componentes aparte. El servidor decide siempre (último administrador, uno mismo…): aquí solo se explica su respuesta.
@Component({
  selector: 'app-admin-users',
  imports: [TranslatePipe, AdminUserList, AdminInviteForm, AdminInviteResult, FormModal, Modal, ConfirmDialog, SecondFactorDialog, Busy],
  templateUrl: './admin-users.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminUsers implements OnInit {
  private readonly service = inject(AdminUserService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly translate = inject(TranslateService);

  readonly rows = signal<AdminUser[]>([]);
  readonly loading = signal(false);
  readonly failed = signal(false);
  readonly status = signal<AdminStatus | ''>('');
  readonly sort = signal<AdminSort>('-created_at');
  readonly pageInfo = signal<PageInfo>({ page: 1, pageSize: PAGE_SIZE, total: 0, totalPages: 0 });
  readonly currentUserId = computed(() => this.auth.currentUser?.id ?? null);

  // Invitar
  readonly inviteOpen = signal(false);
  readonly inviting = signal(false);
  readonly inviteError = signal<string | null>(null);
  readonly inviteFieldErrors = signal<Record<string, string>>({});
  // Lo escrito en el formulario, a la espera del código del segundo factor (lo pide el diálogo reutilizable).
  readonly pendingInvite = signal<InviteAdminData | null>(null);
  readonly inviteCodeError = signal<string | null>(null);
  readonly invited = signal<InvitedAdmin | null>(null);
  readonly resendingId = signal<string | null>(null);
  private readonly inviteForm = viewChild(AdminInviteForm);
  readonly inviteDirty = computed(() => this.inviteForm()?.dirty() ?? false);

  // Desactivar / reactivar
  readonly deactivating = signal<AdminUser | null>(null);
  readonly deactivateSending = signal(false);
  readonly deactivateError = signal<string | null>(null);
  readonly deactivatingName = computed(() => {
    const admin = this.deactivating();
    return admin ? this.nameOf(admin) : '';
  });
  readonly reactivating = signal<AdminUser | null>(null);
  readonly reactivateSending = signal(false);

  ngOnInit(): void {
    this.load(1);
  }

  load(page: number): void {
    const query: AdminListQuery = { page, pageSize: PAGE_SIZE, sort: this.sort(), status: this.status() };
    this.loading.set(true);
    this.failed.set(false);
    this.service.list(query).pipe(unwrapData(), finalize(() => this.loading.set(false))).subscribe({
      next: (data) => {
        this.rows.set(data.items);
        this.pageInfo.set({ page: data.page, pageSize: data.page_size, total: data.total, totalPages: data.total_pages });
      },
      error: () => this.failed.set(true),
    });
  }

  onStatus(status: AdminStatus | ''): void {
    this.status.set(status);
    this.load(1);
  }

  onSort(sort: AdminSort): void {
    this.sort.set(sort);
    this.load(1);
  }

  // ───────── Invitar ─────────
  openInvite(): void {
    this.inviteError.set(null);
    this.inviteFieldErrors.set({});
    this.invited.set(null);
    this.inviteOpen.set(true);
  }

  closeInvite(): void {
    if (this.inviting()) return;
    this.inviteOpen.set(false);
  }

  // El formulario está completo: se pide el código del segundo factor antes de enviar.
  onInvite(data: InviteAdminData): void {
    if (this.inviting()) return;
    this.inviteError.set(null);
    this.inviteFieldErrors.set({});
    this.inviteCodeError.set(null);
    this.pendingInvite.set(data);
  }

  onInviteConfirmed(answer: SecondFactorAnswer): void {
    const data = this.pendingInvite();
    if (!data || !answer.code || this.inviting()) return;
    this.inviting.set(true);
    this.inviteCodeError.set(null);
    this.service.invite({ ...data, totp_code: answer.code }).pipe(unwrapData(), finalize(() => this.inviting.set(false))).subscribe({
      next: (admin) => {
        this.pendingInvite.set(null);
        this.inviteOpen.set(false);
        this.invited.set(admin);
        this.load(1);
      },
      error: (err: ServerError) => {
        // Un código equivocado o una cuenta bloqueada se corrige dentro del diálogo; lo demás vuelve al formulario.
        if (err.code === 'MFA_CODE_INVALID' || err.code === 'ACCOUNT_LOCKED' || err.code === 'MFA_NOT_ENABLED') {
          this.inviteCodeError.set(this.explain(err));
          return;
        }
        this.pendingInvite.set(null);
        if (err.code === 'EMAIL_TAKEN') {
          this.inviteFieldErrors.set({ email: this.explain(err) });
        } else if (err.code === 'VALIDATION_FAILED' && err.fields?.length) {
          this.inviteFieldErrors.set(Object.fromEntries(err.fields.map((f) => [f.field, f.message])));
          this.inviteError.set(this.explain(err));
        } else {
          this.inviteError.set(this.explain(err));
        }
      },
    });
  }

  // ───────── Reenviar la invitación ─────────
  onResend(admin: AdminUser): void {
    if (this.resendingId()) return;
    this.resendingId.set(admin.id);
    this.service.resendInvitation(admin.id).pipe(unwrapData(), finalize(() => this.resendingId.set(null))).subscribe({
      next: ({ invitation }) => {
        const sent = invitation.delivery_status === 'sent';
        if (sent) this.toast.showSuccess(this.translate.instant('ADMIN_USERS.RESEND.SUCCESS_TITLE'), this.translate.instant('ADMIN_USERS.RESEND.SUCCESS_MESSAGE', { email: admin.email }));
        else this.toast.showError(this.translate.instant('ADMIN_USERS.RESEND.FAILED_TITLE'), this.translate.instant('ADMIN_USERS.RESEND.FAILED_MESSAGE', { email: admin.email }), 6000);
        const current = this.invited();
        if (current?.id === admin.id) this.invited.set({ ...current, invitation });
      },
      error: (err: ServerError) => this.failWith('ADMIN_USERS.RESEND.ERROR_TITLE', err),
    });
  }

  onResendFromResult(): void {
    const current = this.invited();
    if (current) this.onResend(current);
  }

  // ───────── Desactivar (pide el código del segundo factor) ─────────
  onDeactivateConfirmed(answer: SecondFactorAnswer): void {
    const admin = this.deactivating();
    if (!admin || !answer.code || this.deactivateSending()) return;
    this.deactivateSending.set(true);
    this.deactivateError.set(null);
    this.service.deactivate(admin.id, answer.code).pipe(unwrapData(), finalize(() => this.deactivateSending.set(false))).subscribe({
      next: () => {
        this.toast.showSuccess(
          this.translate.instant('ADMIN_USERS.DEACTIVATE.SUCCESS_TITLE'),
          this.translate.instant('ADMIN_USERS.DEACTIVATE.SUCCESS_MESSAGE', { name: this.nameOf(admin) }),
        );
        this.deactivating.set(null);
        this.load(this.pageInfo().page);
      },
      error: (err: ServerError) => {
        // Un código equivocado o una cuenta bloqueada se corrige dentro del diálogo; lo demás (último administrador, ya desactivado…) lo cierra y refresca la lista.
        if (err.code === 'MFA_CODE_INVALID' || err.code === 'ACCOUNT_LOCKED' || err.code === 'MFA_NOT_ENABLED') {
          this.deactivateError.set(this.explain(err));
          return;
        }
        this.deactivating.set(null);
        this.failWith('ADMIN_USERS.DEACTIVATE.ERROR_TITLE', err);
        this.load(this.pageInfo().page);
      },
    });
  }

  // ───────── Reactivar (sin segundo factor, D117) ─────────
  onReactivateConfirmed(): void {
    const admin = this.reactivating();
    if (!admin || this.reactivateSending()) return;
    this.reactivateSending.set(true);
    this.service.reactivate(admin.id).pipe(unwrapData(), finalize(() => this.reactivateSending.set(false))).subscribe({
      next: () => {
        this.toast.showSuccess(
          this.translate.instant('ADMIN_USERS.REACTIVATE.SUCCESS_TITLE'),
          this.translate.instant('ADMIN_USERS.REACTIVATE.SUCCESS_MESSAGE', { name: this.nameOf(admin) }),
        );
        this.reactivating.set(null);
        this.load(this.pageInfo().page);
      },
      error: (err: ServerError) => {
        this.reactivating.set(null);
        this.failWith('ADMIN_USERS.REACTIVATE.ERROR_TITLE', err);
        this.load(this.pageInfo().page);
      },
    });
  }

  nameOf(admin: AdminUser): string {
    return `${admin.name} ${admin.last_name}`.trim();
  }

  // El texto del error: el nuestro si el código es del contrato, y si no, el que trajo el servidor.
  private explain(err: ServerError): string {
    const key = adminErrorKey(err.code);
    return key ? this.translate.instant(key) : err.message;
  }

  private failWith(titleKey: string, err: ServerError): void {
    this.toast.showError(this.translate.instant(titleKey), this.explain(err), 6000);
  }
}
