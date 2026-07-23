import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, output } from '@angular/core';
import { Role, User } from '@features/users/models/user.model';
import { UserService } from '@features/users/services/user.service';
import {
  ErrorResponse,
  SuccessResponse,
} from '@shared/models/api-response.model';
import { ToastService } from '@shared/services/toast.service';
import { DialogUtility } from '@syncfusion/ej2-angular-popups';

const ROLE_LABELS: Record<Role, string> = {
  MONKEY_ADMIN: 'Monkey Admin',
  CLIENT_ADMIN: 'Admin de cliente',
  USER: 'Usuario',
  VIEWER: 'Visualizador',
};

@Component({
  selector: 'app-user-list',
  imports: [CommonModule],
  templateUrl: './user-list.html',
  styleUrl: './user-list.css',
  changeDetection: ChangeDetectionStrategy.Default,
})
export class UserList {
  openModalEmit = output<User>();
  refreshUsers = output();

  constructor(
    private toast: ToastService,
    public userService: UserService
  ) {}

  roleLabel(role: Role): string {
    return ROLE_LABELS[role] ?? role;
  }

  onEditUser(user: User) {
    this.openModalEmit.emit(user);
  }

  onDeleteUser(user: User) {
    const confirmDialog = DialogUtility.confirm({
      isModal: true,
      isDraggable: false,
      width: '450px',
      position: { X: 'center', Y: 'center' },
      title: 'Eliminar usuario - ' + user.username,
      content:
        '¿Está seguro que desea desactivar a este usuario? Podrá reactivarlo más adelante.',
      okButton: {
        isFlat: false,
        text: 'Eliminar',
        click: () => {
          this.userService.deleteUser(user.id).subscribe({
            next: (response: SuccessResponse) => {
              this.toast.showSuccess(
                'Usuario eliminado correctamente',
                response.message
              );
              this.refreshUsers.emit();
            },
            error: (error: ErrorResponse) => {
              this.toast.showError(
                'No se pudo eliminar el usuario',
                error.message
              );
            },
          });
          confirmDialog.hide();
        },
      },
      cancelButton: {
        text: 'Cancelar',
        click: () => {
          confirmDialog.hide();
        },
      },
    });
  }

  onReactivateUser(user: User) {
    this.userService.reactivateUser(user.id).subscribe({
      next: (response: SuccessResponse) => {
        this.toast.showSuccess('Usuario reactivado correctamente', response.message);
        this.refreshUsers.emit();
      },
      error: (error: ErrorResponse) => {
        this.toast.showError('No se pudo reactivar el usuario', error.message);
      },
    });
  }
}
