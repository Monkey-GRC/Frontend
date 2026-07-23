import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { environment } from '@environments/environment';
import { CreateUser, Role, UpdateUser, User } from '@features/users/models/user.model';
import { ApiResponse } from '@shared/models/api-response.model';

@Injectable({
  providedIn: 'root'
})
export class UserService {

  apiUrl = environment.apiUrl + '/users';
  form!: FormGroup;
  users!: User[];
  selectedUser: User | null = {} as User;

  constructor(
    private http: HttpClient,
    private fb: FormBuilder
  ) { }

  initializeForm(data?: User) {
    this.form = this.fb.group({
      email: [data?.email, [Validators.required, Validators.email]],
      username: [data?.username, [Validators.required, Validators.maxLength(50)]],
      password: [null, data ? [Validators.minLength(8)] : [Validators.required, Validators.minLength(8)]],
      name: [data?.name, [Validators.maxLength(100)]],
      last_name: [data?.last_name, [Validators.maxLength(100)]],
      role: [data?.role ?? 'USER', [Validators.required]],
      client_id: [data?.client_id],
    });

    this.form.get('role')?.valueChanges.subscribe((role: Role) => {
      const clientIdControl = this.form.get('client_id');
      if (role === 'CLIENT_ADMIN') {
        clientIdControl?.setValidators([Validators.required]);
      } else {
        clientIdControl?.clearValidators();
        clientIdControl?.setValue(null);
      }
      clientIdControl?.updateValueAndValidity({ emitEvent: false });
    });
  }

  createUser(body: CreateUser) {
    return this.http.post<ApiResponse<User>>(`${this.apiUrl}`, body);
  }

  updateUser(id: string, body: UpdateUser) {
    return this.http.patch<ApiResponse<User>>(`${this.apiUrl}/${id}`, body);
  }

  deleteUser(id: string) {
    return this.http.delete<ApiResponse>(`${this.apiUrl}/${id}`);
  }

  reactivateUser(id: string) {
    return this.http.patch<ApiResponse<User>>(`${this.apiUrl}/${id}`, { is_active: true });
  }

  readAllUsers() {
    return this.http.get<ApiResponse<User[]>>(`${this.apiUrl}`);
  }

  readUser(id: string) {
    return this.http.get<ApiResponse<User>>(`${this.apiUrl}/${id}`);
  }

}
