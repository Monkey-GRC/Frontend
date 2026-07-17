import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, output } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { Template } from '@features/grc-framework/models/template.model';
import { TemplateService } from '@features/grc-framework/services/template.service';
import { ErrorResponse, SuccessResponse } from '@shared/models/api-response.model';
import { ToastService } from '@shared/services/toast.service';
import { TextAreaModule, TextBoxModule } from '@syncfusion/ej2-angular-inputs';

@Component({
  selector: 'app-template-form',
  imports: [CommonModule, ReactiveFormsModule, TextAreaModule, TextBoxModule],
  templateUrl: './template-form.html',
  styleUrl: './template-form.css',
  changeDetection: ChangeDetectionStrategy.Default,
})
export class TemplateForm implements OnInit {
  /** Emite la plantilla creada/actualizada */
  sendedForm = output<Template>();
  sendingForm = false;
  action: 'create' | 'update' = 'create';

  constructor(
    public templateService: TemplateService,
    private toast: ToastService,
  ) { }

  ngOnInit(): void {
    this.templateService.initializeForm();
  }

  async onSubmit(): Promise<void> {
    if (this.templateService.form.invalid) {
      this.sendingForm = false;
      return;
    }

    this.sendingForm = true;
    const body = this.templateService.form.value;
    const request = this.getRequestFunction(body);

    try {
      const resp = await this.executeRequest(request);
      this.handleSuccess(resp);
    } catch (err) {
      this.handleError(err as ErrorResponse);
    }
  }

  private getRequestFunction(body: any) {
    return this.action === 'create' && !this.templateService.selectedTemplate?.id
      ? () => this.templateService.createTemplate(body)
      : () => this.templateService.updateTemplate(this.templateService.selectedTemplate!.id, body);
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
    const actionText = this.action === 'create' ? 'creada' : 'actualizada';
    this.toast.showSuccess(`Plantilla ${actionText}`, resp.message);
    this.sendingForm = false;
    this.sendedForm.emit(resp.data);
  }

  private handleError(err: ErrorResponse): void {
    const actionText = this.action === 'create' ? 'crear' : 'actualizar';
    this.toast.showError(`Error al ${actionText} la plantilla`, err.message);
    this.sendingForm = false;
  }
}
