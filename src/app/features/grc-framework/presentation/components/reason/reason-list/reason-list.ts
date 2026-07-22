import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, output } from '@angular/core';
import { Reason } from '@features/grc-framework/models/reason.model';
import { ReasonService } from '@features/grc-framework/services/reason.service';
import {
  ErrorResponse,
  SuccessResponse,
} from '@shared/models/api-response.model';
import { ToastService } from '@shared/services/toast.service';
import { DialogUtility } from '@syncfusion/ej2-angular-popups';

@Component({
  selector: 'app-reason-list',
  imports: [CommonModule],
  templateUrl: './reason-list.html',
  styleUrl: './reason-list.css',
  changeDetection: ChangeDetectionStrategy.Default,
})
export class ReasonList {
  openModalEmit = output<Reason>();
  refreshReason = output();

  constructor(
    private toast: ToastService,
    public reasonService: ReasonService
  ) {}

  onEditReason(reason: Reason) {
    this.openModalEmit.emit(reason);
  }

  onDeleteReason(reason: Reason) {
    if (reason) {
      const confirmDialog = DialogUtility.confirm({
        isModal: true,
        isDraggable: false,
        width: '450px',
        position: { X: 'center', Y: 'center' },
        title: 'Eliminar la causa - ' + reason.code,
        content:
          '¿Está seguro que desea eliminar esta causa de forma permanente?',
        okButton: {
          isFlat: false,
          text: 'Eliminar',
          click: () => {
            this.reasonService.deleteReason(reason!.id).subscribe({
              next: (response: SuccessResponse) => {
                this.toast.showSuccess(
                  'Causa eliminada correctamente',
                  response.message
                );
                this.refreshReason.emit();
              },
              error: (error: ErrorResponse) => {
                this.toast.showError(
                  'No se pudo eliminar la causa',
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
  }
}
