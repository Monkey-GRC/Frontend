import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, output } from '@angular/core';
import { Risk } from '@features/grc-framework/models/risk.model';
import { RiskService } from '@features/grc-framework/services/risk.service';
import { ErrorResponse, SuccessResponse } from '@shared/models/api-response.model';
import { ToastService } from '@shared/services/toast.service';
import { DialogUtility } from '@syncfusion/ej2-angular-popups';

@Component({
  selector: 'app-risk-list',
  imports: [
    CommonModule,
  ],
  templateUrl: './risk-list.html',
  styleUrl: './risk-list.css',
  changeDetection: ChangeDetectionStrategy.Default,
})
export class RiskList {

  openModalEmit = output<Risk>();
  refreshRisk = output();

  constructor(
    private toast: ToastService,
    public riskService: RiskService
  ) {}

  getLevelColor(level: string): string {
    switch (level) {
      case 'LOW': return 'bg-green-300 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'MEDIUM': return 'bg-yellow-300 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'HIGH': return 'bg-orange-300 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300';
      case 'CRITICAL': return 'bg-red-300 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      default: return 'bg-gray-300 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  }

  onSelectRisk(risk: any) {
    console.log('Riesgo seleccionado:', risk);
  }

  onEditRisk(risk: Risk) {
    this.openModalEmit.emit(risk);
  }

  onDeleteRisk(risk: Risk) {
    if (risk) {
      const confirmDialog = DialogUtility.confirm({
        isModal: true,
        isDraggable: false,
        width: '450px',
        position: { X: 'center', Y: 'center' },
        title: 'Eliminar el riesgo - ' + risk.code,
        content: '¿Está seguro que desea eliminar este riesgo de forma permanente?',
        okButton: {
          isFlat: false,
          text: 'Eliminar',
          click: () => {
            this.riskService.deleteRisk(risk!.id).subscribe({
              next: (response: SuccessResponse) => {
                this.toast.showSuccess('Riesgo eliminado correctamente', response.message);
                this.refreshRisk.emit();
              },
              error: (error: ErrorResponse) => {
                this.toast.showError('No se pudo eliminar el riesgo', error.message);
              }
            });
            confirmDialog.hide();
          }
        },
        cancelButton: {
          text: 'Cancelar',
          click: () => {
            confirmDialog.hide();
          }
        }
      })
    }
  }

}
