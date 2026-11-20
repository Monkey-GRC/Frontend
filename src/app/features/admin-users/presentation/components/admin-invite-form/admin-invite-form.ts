import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { inject } from '@angular/core';
import { INVITABLE_ROLES, InviteAdminData } from '@features/admin-users/models/admin-user.model';
import { Field } from '@shared/presentation/components/field/field';
import { Select, SelectOption } from '@shared/presentation/components/select/select';
import { startWith } from 'rxjs';
import { hasChanges } from '@shared/domain/utils/form-changes';

// El formulario de invitar a un administrador: correo, nombre, apellido y rol (hoy solo admin_monkey, D117).
// No llama al servidor ni pide el segundo factor: valida y emite `invited`; la vista abre el diálogo del código y envía, y le devuelve el error (`error`, `fieldErrors`). El botón de enviar vive en el pie del modal (`form="admin-invite-form"`).
@Component({
  selector: 'app-admin-invite-form',
  imports: [ReactiveFormsModule, Field, Select],
  templateUrl: './admin-invite-form.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminInviteForm {
  private readonly fb = inject(FormBuilder);

  readonly busy = input(false);
  // Un error general del servidor (cuenta bloqueada, validación…), ya traducido.
  readonly error = input<string | null>(null);
  // Errores por campo del servidor (un 422 o un correo repetido), ya traducidos: `{ email: '…' }`.
  readonly fieldErrors = input<Record<string, string>>({});
  readonly invited = output<InviteAdminData>();

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email, Validators.maxLength(254)]],
    name: ['', [Validators.required, Validators.maxLength(100)]],
    last_name: ['', [Validators.required, Validators.maxLength(100)]],
    role: ['admin_monkey', Validators.required],
  });
  readonly submitted = signal(false);
  readonly roleOptions: SelectOption[] = INVITABLE_ROLES.map((value) => ({ value, labelKey: `ADMIN_USERS.ROLE.${value}` }));

  private readonly initial = this.form.getRawValue();
  private readonly values = toSignal(this.form.valueChanges.pipe(startWith(this.form.getRawValue())), { initialValue: this.form.getRawValue() });
  // MD-485 · Con algo escrito o elegido distinto de lo de partida, cerrar el modal pide confirmar antes de descartarlo (`guarded`).
  readonly dirty = computed(() => hasChanges(this.initial, this.values()));

  protected errorKey(name: 'email' | 'name' | 'last_name'): string | null {
    const control = this.form.controls[name];
    if (!(this.submitted() || control.touched)) return null;
    if (control.hasError('required')) return 'ADMIN_USERS.FORM.REQUIRED';
    if (control.hasError('email')) return 'ADMIN_USERS.FORM.INVALID_EMAIL';
    if (control.hasError('maxlength')) return name === 'email' ? 'ADMIN_USERS.FORM.TOO_LONG_EMAIL' : 'ADMIN_USERS.FORM.TOO_LONG';
    return null;
  }

  submit(): void {
    if (this.busy()) return;
    this.submitted.set(true);
    this.form.controls.email.setValue(this.form.controls.email.value.trim());
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    const { email, name, last_name, role } = this.form.getRawValue();
    this.invited.emit({ email: email.trim().toLowerCase(), name: name.trim(), last_name: last_name.trim(), role: role as InviteAdminData['role'] });
  }
}
