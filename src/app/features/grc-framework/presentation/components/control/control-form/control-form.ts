import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, output } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { ChecklistSelector } from '@features/grc-framework/presentation/components/control/checklist-selector/checklist-selector';
import { Control } from '@features/grc-framework/models/control.model';
import { ControlService } from '@features/grc-framework/services/control.service';
import { ErrorResponse, SuccessResponse } from '@shared/models/api-response.model';
import { ToastService } from '@shared/services/toast.service';
import { TextAreaModule, TextBoxModule } from '@syncfusion/ej2-angular-inputs';

@Component({
  selector: 'app-control-form',
  imports: [CommonModule, ReactiveFormsModule, TextAreaModule, TextBoxModule, ChecklistSelector],
  templateUrl: './control-form.html',
  styleUrl: './control-form.css',
  changeDetection: ChangeDetectionStrategy.Default,
})
export class ControlForm implements OnInit {
  /** Emite el control creado/actualizado (undefined si falló) */
  sendedForm = output<Control | undefined>();
  sendingForm = false;
  action: 'create' | 'update' = 'create';

  controlTypes = [
    { text: 'Manual', value: 'MANUAL' },
    { text: 'Automático', value: 'AUTOMATIC' },
    { text: 'Híbrido', value: 'HYBRID' },
  ];

  constructor(
    public controlService: ControlService,
    private toast: ToastService,
  ) { }

  ngOnInit(): void {
    if (this.action === 'create') {
      this.controlService.selectedControl = null;
    }
    this.controlService.initializeForm();
  }

  get isAutomatic(): boolean {
    return this.controlService.form.get('type')?.value === 'AUTOMATIC';
  }

  async onSubmit(): Promise<void> {
    if (this.controlService.form.invalid) {
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
    const body = { ...this.controlService.form.value };
    if (body.type !== 'AUTOMATIC' || !body.checklist?.length) {
      delete body.os;
      delete body.checklist;
    }
    return body;
  }

  private getRequestFunction(body: any) {
    return this.action === 'create' && !this.controlService.selectedControl?.id
      ? () => this.controlService.createControl(body)
      : () => this.controlService.updateControl(this.controlService.selectedControl!.id, body);
  }

  private async executeRequest(requestFn: Function): Promise<SuccessResponse> {
    return new Promise((resolve, reject) => {
      requestFn().subscribe({
        next: (resp: SuccessResponse) => resolve(resp),
        error: (err: ErrorResponse) => reject(err)
      });
    });
  }

  private handleSuccess(resp: SuccessResponse): void {
    const actionText = this.action === 'create' ? 'creado' : 'actualizado';
    this.toast.showSuccess(`Control ${actionText}`, resp.message);
    this.finalizeOperation(resp.data);
  }

  private handleError(err: ErrorResponse): void {
    const actionText = this.action === 'create' ? 'crear' : 'actualizar';
    this.toast.showError(`Error al ${actionText} control`, err.message);
    this.finalizeOperation(undefined);
  }

  private finalizeOperation(control: Control | undefined): void {
    this.sendingForm = false;
    this.sendedForm.emit(control);
    if (this.action === 'create') {
      this.resetForm();
    }
  }

  private resetForm(): void {
    this.controlService.initializeForm();
    this.action = 'create';
    this.controlService.selectedControl = null;
  }
}
