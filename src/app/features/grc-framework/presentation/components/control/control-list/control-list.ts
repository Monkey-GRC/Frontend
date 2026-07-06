import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, output } from '@angular/core';
import { Control } from '@features/grc-framework/models/control.model';
import { ControlService } from '@features/grc-framework/services/control.service';
import { ErrorResponse, SuccessResponse } from '@shared/models/api-response.model';
import { ToastService } from '@shared/services/toast.service';
import { DialogUtility } from '@syncfusion/ej2-angular-popups';

@Component({
  selector: 'app-control-list',
  imports: [CommonModule],
  templateUrl: './control-list.html',
  styleUrl: './control-list.css',
  changeDetection: ChangeDetectionStrategy.Default,
})
export class ControlList {

  openModalEmit = output<Control>();
  refreshControl = output();

  constructor(
    private toast: ToastService,
    public controlService: ControlService
  ) {}

  getTypeColor(type: string): string {
    switch (type) {
      case 'MANUAL': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'AUTOMATIC': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'HYBRID': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  }

  getTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      MANUAL: 'Manual',
      AUTOMATIC: 'Automático',
      HYBRID: 'Híbrido'
    };
    return labels[type] ?? type;
  }

  onEditControl(control: Control) {
    this.openModalEmit.emit(control);
  }

  onDeleteControl(control: Control) {
    if (control) {
      const confirmDialog = DialogUtility.confirm({
        isModal: true,
        isDraggable: false,
        width: '450px',
        position: { X: 'center', Y: 'center' },
        title: 'Eliminar el control - ' + control.code,
        content: '¿Está seguro que desea eliminar este control de forma permanente?',
        okButton: {
          isFlat: false,
          text: 'Eliminar',
          click: () => {
            this.controlService.deleteControl(control.id).subscribe({
              next: (response: SuccessResponse) => {
                this.toast.showSuccess('Control eliminado correctamente', response.message);
                this.refreshControl.emit();
              },
              error: (error: ErrorResponse) => {
                this.toast.showError('No se pudo eliminar el control', error.message);
              }
            });
            confirmDialog.hide();
          }
        },
        cancelButton: {
          text: 'Cancelar',
          click: () => confirmDialog.hide()
        }
      });
    }
  }
}
