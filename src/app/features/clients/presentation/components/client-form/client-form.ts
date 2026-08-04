import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  output,
} from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { CreateClientResult } from '@features/clients/models/client.model';
import { ClientService, DOCUMENT_TYPES } from '@features/clients/services/client.service';
import {
  ErrorResponse,
  SuccessResponse,
} from '@shared/models/api-response.model';
import { ToastService } from '@shared/services/toast.service';
import { TextBoxModule } from '@syncfusion/ej2-angular-inputs';

@Component({
  selector: 'app-client-form',
  imports: [CommonModule, ReactiveFormsModule, TextBoxModule],
  templateUrl: './client-form.html',
  styleUrl: './client-form.css',
  changeDetection: ChangeDetectionStrategy.Default,
})
export class ClientForm implements OnInit {
  sendedForm = output<CreateClientResult | undefined>();
  sendingForm = false;
  documentTypes = DOCUMENT_TYPES;

  constructor(
    public clientService: ClientService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.clientService.initializeForm();
  }

  async onSubmit(): Promise<void> {
    if (this.clientService.form.invalid) {
      this.clientService.form.markAllAsTouched();
      this.toast.showWarning(
        'Formulario incompleto',
        'Complete los campos obligatorios antes de continuar'
      );
      return;
    }

    const body = { ...this.clientService.form.value };
    this.sendingForm = true;
    this.clientService.form.disable();

    try {
      const resp = await this.executeRequest(() =>
        this.clientService.createClient(body)
      );
      this.toast.showSuccess('Tenant creado', resp.message);
      this.sendedForm.emit(resp.data);
      this.resetForm();
    } catch (err) {
      const error = err as ErrorResponse;
      this.toast.showError('Error al crear el tenant', error.message);
      this.sendedForm.emit(undefined);
      this.clientService.form.enable();
    } finally {
      this.sendingForm = false;
    }
  }

  private async executeRequest(
    requestFn: () => ReturnType<ClientService['createClient']>
  ): Promise<SuccessResponse<CreateClientResult>> {
    return new Promise((resolve, reject) => {
      requestFn().subscribe({
        next: (resp) => resolve(resp as SuccessResponse<CreateClientResult>),
        error: (err: ErrorResponse) => reject(err),
      });
    });
  }

  private resetForm(): void {
    this.clientService.initializeForm();
  }
}
