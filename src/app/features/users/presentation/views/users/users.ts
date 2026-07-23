import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, ViewChild } from '@angular/core';
import { UserList } from '@features/users/presentation/components/user-list/user-list';
import { UserForm } from '@features/users/presentation/components/user-form/user-form';
import { DialogComponent } from '@shared/presentation/components/dialog/dialog';
import { User } from '@features/users/models/user.model';
import { TranslateModule } from '@ngx-translate/core';
import { UserService } from '@features/users/services/user.service';
import { ToastService } from '@shared/services/toast.service';
import { SuccessResponse, ErrorResponse } from '@shared/models/api-response.model';
import { LoaderComponent } from '@shared/presentation/components/loader/loader.component';

@Component({
  selector: 'app-users',
  imports: [
    CommonModule,
    UserList,
    DialogComponent,
    UserForm,
    TranslateModule,
    LoaderComponent
  ],
  templateUrl: './users.html',
  styleUrl: './users.css',
  changeDetection: ChangeDetectionStrategy.Default,
})
export class Users implements OnInit {
  title: string = 'Crear un nuevo usuario';
  subtile: string | null = 'En este formulario puede crear un nuevo usuario de la plataforma y asignarle su rol de acceso';
  submitText: string = 'Crear usuario';
  action: 'create' | 'update' = 'create';
  isVisible: boolean = false;
  isLoading: boolean = false;

  constructor(
    public userService: UserService,
    private toast: ToastService,
  ) { }

  ngOnInit(): void {
    this.readAllUsers();
  }

  @ViewChild(UserForm) userForm!: UserForm;
  @ViewChild(UserList) userList!: UserList;

  onOpenModal(action: 'create' | 'update', user?: User) {
    this.userForm.action = action;
    this.isVisible = true;
    if (action === 'update') {
      this.userService.selectedUser = user!;
      this.title = `Editar usuario - ${user?.username}`;
      this.subtile = null;
      this.submitText = 'Actualizar usuario';
      this.userService.initializeForm(user);
    } else {
      this.userService.selectedUser = null;
      this.userService.initializeForm();
    }
  }

  onCloseModal() {
    this.isVisible = false;
    this.title = 'Crear un nuevo usuario';
    this.subtile = 'En este formulario puede crear un nuevo usuario de la plataforma y asignarle su rol de acceso';
    this.submitText = 'Crear usuario';
    this.action = 'create';
  }

  onSubmitForm() {
    this.isVisible = false;
    this.readAllUsers();
  }

  readAllUsers() {
    this.isLoading = true;
    this.userService.readAllUsers().subscribe({
      next: (resp: SuccessResponse) => {
        this.userService.users = resp.data;
        this.isLoading = false;
      },
      error: (err: ErrorResponse) => {
        this.toast.showError('No se cargaron los usuarios', err.message);
        this.isLoading = false;
      }
    })
  }

}
