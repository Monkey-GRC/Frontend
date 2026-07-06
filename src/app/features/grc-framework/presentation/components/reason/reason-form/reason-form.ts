import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  output,
} from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { ReasonService } from '@features/grc-framework/services/reason.service';
import {
  ErrorResponse,
  SuccessResponse,
} from '@shared/models/api-response.model';
import { ToastService } from '@shared/services/toast.service';
import { TextAreaModule, TextBoxModule } from '@syncfusion/ej2-angular-inputs';

@Component({
  selector: 'app-reason-form',
  imports: [CommonModule, ReactiveFormsModule, TextAreaModule, TextBoxModule],
  templateUrl: './reason-form.html',
  styleUrl: './reason-form.css',
  changeDetection: ChangeDetectionStrategy.Default,
})
export class ReasonForm implements OnInit {
  /** Emite evento cuando se necesita recargar la lista de razones */
  sendedForm = output();

  /** Estado del formulario */
  sendingForm = false;
  action: 'create' | 'update' = 'create';

  constructor(
    public reasonService: ReasonService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.reasonService.initializeForm();
  }

  //  GESTIÓN DEL FORMULARIO 
  
  /** Maneja el envío del formulario */
  async onSubmit(): Promise<void> {
    if (this.reasonService.form.invalid) {
      this.sendingForm = false;
      return;
    }

    this.sendingForm = true;
    const body = this.reasonService.form.value;
    const request = this.getRequestFunction(body);

    try {
      const resp = await this.executeRequest(request);
      this.handleSuccess(resp);
    } catch (err) {
      this.handleError(err as ErrorResponse);
    }
  }

  /** Determina qué función de servicio usar según la acción */
  private getRequestFunction(body: any) {
    return this.action === 'create' && !this.reasonService.selectedReason!.id
      ? () => this.reasonService.createReason(body)
      : () =>
          this.reasonService.updateReason(
            this.reasonService.selectedReason!.id,
            body
          );
  }

  /** Ejecuta la petición HTTP */
  private async executeRequest(requestFn: Function): Promise<SuccessResponse> {
    return new Promise((resolve, reject) => {
      requestFn().subscribe({
        next: (resp: SuccessResponse) => resolve(resp),
        error: (err: ErrorResponse) => reject(err),
      });
    });
  }

  /** Maneja respuesta exitosa */
  private handleSuccess(resp: SuccessResponse): void {
    const actionText = this.action === 'create' ? 'creada' : 'actualizada';
    this.toast.showSuccess(`Razón ${actionText}`, resp.message);
    this.finalizeOperation();
  }

  /** Maneja error */
  private handleError(err: ErrorResponse): void {
    const actionText = this.action === 'create' ? 'crear' : 'actualizar';
    this.toast.showError(`Error al ${actionText} razón`, err.message);
    this.finalizeOperation();
  }

  /** Finaliza la operación (éxito o error) */
  private finalizeOperation(): void {
    this.sendingForm = false;
    this.sendedForm.emit();
    if (this.action === 'create') {
      this.resetForm();
    }
  }

  /** Resetea el formulario a estado inicial */
  private resetForm(): void {
    this.reasonService.initializeForm();
    this.action = 'create';
    this.reasonService.selectedReason = null;
  }
}
