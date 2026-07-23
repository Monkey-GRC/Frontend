import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  output,
} from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { User } from '@features/users/models/user.model';
import { UserService } from '@features/users/services/user.service';
import {
  ErrorResponse,
  SuccessResponse,
} from '@shared/models/api-response.model';
import { ToastService } from '@shared/services/toast.service';
import { TextBoxModule } from '@syncfusion/ej2-angular-inputs';

@Component({
  selector: 'app-user-form',
  imports: [CommonModule, ReactiveFormsModule, TextBoxModule],
  templateUrl: './user-form.html',
  styleUrl: './user-form.css',
  changeDetection: ChangeDetectionStrategy.Default,
})
export class UserForm implements OnInit {
  sendedForm = output<User | undefined>();
  sendingForm = false;
  action: 'create' | 'update' = 'create';

  constructor(
    public userService: UserService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.userService.initializeForm();
  }

  get isClientAdmin(): boolean {
    return this.userService.form.get('role')?.value === 'CLIENT_ADMIN';
  }

  async onSubmit(): Promise<void> {
    if (this.userService.form.invalid) {
      this.userService.form.markAllAsTouched();
      this.toast.showWarning(
        'Formulario incompleto',
        'Complete los campos obligatorios antes de continuar'
      );
      this.sendingForm = false;
      return;
    }

    this.sendingForm = true;
    const body = this.buildRequestBody();
    const request = this.getRequestFunction(body);

    try {
      const resp = await this.executeRequest(request);
      this.handleSuccess(resp);
    } catch (err) {
      this.handleError(err as ErrorResponse);
    }
  }

  private buildRequestBody(): any {
    const body = { ...this.userService.form.value };

    if (body.role !== 'CLIENT_ADMIN') {
      delete body.client_id;
    }

    if (this.action === 'update' && !body.password) {
      delete body.password;
    }

    if (!body.name) delete body.name;
    if (!body.last_name) delete body.last_name;

    return body;
  }

  private getRequestFunction(body: any) {
    return this.action === 'create' && !this.userService.selectedUser?.id
      ? () => this.userService.createUser(body)
      : () =>
          this.userService.updateUser(
            this.userService.selectedUser!.id,
            body
          );
  }

  private async executeRequest(requestFn: Function): Promise<SuccessResponse> {
    return new Promise((resolve, reject) => {
      requestFn().subscribe({
        next: (resp: SuccessResponse) => resolve(resp),
        error: (err: ErrorResponse) => reject(err),
      });
    });
  }

  private handleSuccess(resp: SuccessResponse): void {
    const actionText = this.action === 'create' ? 'creado' : 'actualizado';
    this.toast.showSuccess(`Usuario ${actionText}`, resp.message);
    this.finalizeOperation(resp.data);
  }

  private handleError(err: ErrorResponse): void {
    const actionText = this.action === 'create' ? 'crear' : 'actualizar';
    this.toast.showError(`Error al ${actionText} usuario`, err.message);
    this.finalizeOperation(undefined);
  }

  private finalizeOperation(user: User | undefined): void {
    this.sendingForm = false;
    this.sendedForm.emit(user);
    if (this.action === 'create') {
      this.resetForm();
    }
  }

  private resetForm(): void {
    this.userService.initializeForm();
    this.action = 'create';
    this.userService.selectedUser = null;
  }
}
