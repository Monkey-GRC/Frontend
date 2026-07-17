import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, output } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { Reason } from '@features/grc-framework/models/reason.model';
import { ReasonService } from '@features/grc-framework/services/reason.service';
import { ErrorResponse, SuccessResponse } from '@shared/models/api-response.model';
import { ToastService } from '@shared/services/toast.service';
import { TextAreaModule, TextBoxModule } from '@syncfusion/ej2-angular-inputs';

/** Mini-form de creación rápida de una causa (name + description), siempre en modo crear. */
@Component({
  selector: 'app-reason-quick-form',
  imports: [CommonModule, ReactiveFormsModule, TextAreaModule, TextBoxModule],
  templateUrl: './reason-quick-form.html',
  styleUrl: './reason-quick-form.css',
  changeDetection: ChangeDetectionStrategy.Default,
})
export class ReasonQuickForm implements OnInit {
  created = output<Reason>();
  sendingForm = false;

  constructor(
    public reasonService: ReasonService,
    private toast: ToastService,
  ) { }

  ngOnInit(): void {
    this.reasonService.initializeForm();
  }

  onSubmit(): void {
    if (this.reasonService.form.invalid) {
      return;
    }

    this.sendingForm = true;
    const body = this.reasonService.form.value;
    this.reasonService.createReason(body).subscribe({
      next: (resp: SuccessResponse<Reason>) => {
        this.toast.showSuccess('Causa creada', resp.message);
        this.sendingForm = false;
        this.reasonService.initializeForm();
        this.created.emit(resp.data!);
      },
      error: (err: ErrorResponse) => {
        this.toast.showError('Error al crear la causa', err.message);
        this.sendingForm = false;
      }
    });
  }
}
