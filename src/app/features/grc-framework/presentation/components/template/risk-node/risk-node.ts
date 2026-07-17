import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input, output } from '@angular/core';
import { ReasonQuickForm } from '@features/grc-framework/presentation/components/reason/reason-quick-form/reason-quick-form';
import { ReasonNode } from '@features/grc-framework/presentation/components/template/reason-node/reason-node';
import { Control } from '@features/grc-framework/models/control.model';
import { Reason } from '@features/grc-framework/models/reason.model';
import { Risk } from '@features/grc-framework/models/risk.model';
import { TemplateRiskSummary } from '@features/grc-framework/models/template.model';
import { ReasonService } from '@features/grc-framework/services/reason.service';
import { RiskService } from '@features/grc-framework/services/risk.service';
import { ErrorResponse, SuccessResponse } from '@shared/models/api-response.model';
import { ToastService } from '@shared/services/toast.service';
import { DialogUtility } from '@syncfusion/ej2-angular-popups';

@Component({
  selector: 'app-risk-node',
  imports: [CommonModule, ReasonQuickForm, ReasonNode],
  templateUrl: './risk-node.html',
  styleUrl: './risk-node.css',
  changeDetection: ChangeDetectionStrategy.Default,
})
export class RiskNode {
  @Input() risk!: TemplateRiskSummary;
  @Input() templateId!: string;
  @Input() allReasons: Reason[] = [];
  @Input() allControls: Control[] = [];

  changed = output();
  /** Notifica al padre que la lista global de causas puede haber cambiado (nueva causa creada) */
  reasonsChanged = output();
  /** Notifica al padre que la lista global de controles puede haber cambiado (nuevo control creado) */
  controlsChanged = output();

  expanded = false;
  loadingDetail = false;
  riskDetail?: Risk;
  addingReason = false;
  reasonSearchTerm = '';
  linkingReasonId: string | null = null;

  constructor(
    private riskService: RiskService,
    private reasonService: ReasonService,
    private toast: ToastService,
  ) { }

  toggleExpand(): void {
    this.expanded = !this.expanded;
    if (this.expanded && !this.riskDetail) {
      this.loadRiskDetail();
    }
  }

  loadRiskDetail(): void {
    this.loadingDetail = true;
    this.riskService.readRisk(this.risk.id).subscribe({
      next: (resp: SuccessResponse) => {
        this.riskDetail = resp.data;
        this.loadingDetail = false;
      },
      error: (err: ErrorResponse) => {
        this.toast.showError('No se pudieron cargar las causas del riesgo', err.message);
        this.loadingDetail = false;
      }
    });
  }

  get availableReasons(): Reason[] {
    const term = this.reasonSearchTerm.trim().toLowerCase();
    const linkedIds = new Set((this.riskDetail?.reasons ?? []).map(item => item.reason.id));
    return this.allReasons.filter(reason => !linkedIds.has(reason.id) && (!term || reason.name.toLowerCase().includes(term)));
  }

  onSearchReasonInput(event: Event): void {
    this.reasonSearchTerm = (event.target as HTMLInputElement).value;
  }

  onToggleAddReason(): void {
    this.addingReason = !this.addingReason;
  }

  onLinkReason(reason: Reason): void {
    this.linkingReasonId = reason.id;
    this.reasonService.linkRisks(reason.id, [this.risk.id]).subscribe({
      next: (resp: SuccessResponse) => {
        this.toast.showSuccess('Causa vinculada al riesgo', resp.message);
        this.linkingReasonId = null;
        this.reasonSearchTerm = '';
        this.loadRiskDetail();
      },
      error: (err: ErrorResponse) => {
        this.toast.showError('No se pudo vincular la causa', err.message);
        this.linkingReasonId = null;
      }
    });
  }

  onReasonQuickCreated(reason: Reason): void {
    this.reasonService.linkRisks(reason.id, [this.risk.id]).subscribe({
      next: () => {
        this.addingReason = false;
        this.loadRiskDetail();
        this.reasonsChanged.emit();
      },
      error: (err: ErrorResponse) => {
        this.toast.showError('No se pudo vincular la causa creada', err.message);
      }
    });
  }

  onReasonRemoved(): void {
    this.loadRiskDetail();
  }

  onControlsChanged(): void {
    this.controlsChanged.emit();
  }

  getLevelColor(level?: string): string {
    switch (level) {
      case 'LOW': return 'bg-green-300 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'MEDIUM': return 'bg-yellow-300 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'HIGH': return 'bg-orange-300 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300';
      case 'CRITICAL': return 'bg-red-300 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      default: return 'bg-gray-300 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  }

  onRemoveFromTemplate(): void {
    const confirmDialog = DialogUtility.confirm({
      isModal: true,
      isDraggable: false,
      width: '450px',
      position: { X: 'center', Y: 'center' },
      title: 'Quitar el riesgo - ' + this.risk.code,
      content: '¿Está seguro que desea quitar este riesgo de la plantilla? El riesgo no se elimina, solo se desvincula.',
      okButton: {
        isFlat: false,
        text: 'Quitar',
        click: () => {
          this.riskService.updateRisk(this.risk.id, { templateId: null }).subscribe({
            next: (response: SuccessResponse) => {
              this.toast.showSuccess('Riesgo quitado de la plantilla', response.message);
              this.changed.emit();
            },
            error: (error: ErrorResponse) => {
              this.toast.showError('No se pudo quitar el riesgo', error.message);
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
