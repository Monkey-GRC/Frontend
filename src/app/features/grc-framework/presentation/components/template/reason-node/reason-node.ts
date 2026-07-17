import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input, ViewChild, output } from '@angular/core';
import { ControlForm } from '@features/grc-framework/presentation/components/control/control-form/control-form';
import { Control } from '@features/grc-framework/models/control.model';
import { Reason } from '@features/grc-framework/models/reason.model';
import { RiskReasonSummary } from '@features/grc-framework/models/risk.model';
import { ReasonService } from '@features/grc-framework/services/reason.service';
import { ErrorResponse, SuccessResponse } from '@shared/models/api-response.model';
import { ToastService } from '@shared/services/toast.service';
import { DialogUtility } from '@syncfusion/ej2-angular-popups';

@Component({
  selector: 'app-reason-node',
  imports: [CommonModule, ControlForm],
  templateUrl: './reason-node.html',
  styleUrl: './reason-node.css',
  changeDetection: ChangeDetectionStrategy.Default,
})
export class ReasonNode {
  @Input() reason!: RiskReasonSummary;
  @Input() riskId!: string;
  @Input() allControls: Control[] = [];

  changed = output();
  /** Notifica al padre que la lista global de controles puede haber cambiado (nuevo control creado) */
  controlsChanged = output();

  expanded = false;
  loadingControls = false;
  reasonDetail?: Reason;
  addingControl = false;
  controlSearchTerm = '';
  linkingControlId: string | null = null;
  expandedChecksIds = new Set<string>();

  @ViewChild(ControlForm) controlForm?: ControlForm;

  constructor(
    private reasonService: ReasonService,
    private toast: ToastService,
  ) { }

  toggleExpand(): void {
    this.expanded = !this.expanded;
    if (this.expanded && !this.reasonDetail) {
      this.loadReasonDetail();
    }
  }

  loadReasonDetail(): void {
    this.loadingControls = true;
    this.reasonService.readReason(this.reason.id).subscribe({
      next: (resp: SuccessResponse) => {
        this.reasonDetail = resp.data;
        this.loadingControls = false;
      },
      error: (err: ErrorResponse) => {
        this.toast.showError('No se pudieron cargar los controles de la causa', err.message);
        this.loadingControls = false;
      }
    });
  }

  get availableControls(): Control[] {
    const term = this.controlSearchTerm.trim().toLowerCase();
    const linkedIds = new Set((this.reasonDetail?.controls ?? []).map(item => item.control.id));
    return this.allControls.filter(control => !linkedIds.has(control.id) && (!term || control.name.toLowerCase().includes(term)));
  }

  onSearchControlInput(event: Event): void {
    this.controlSearchTerm = (event.target as HTMLInputElement).value;
  }

  onToggleAddControl(): void {
    this.addingControl = !this.addingControl;
  }

  onLinkControl(control: Control): void {
    this.linkingControlId = control.id;
    this.reasonService.linkControls(this.reason.id, [control.id]).subscribe({
      next: (resp: SuccessResponse) => {
        this.toast.showSuccess('Control vinculado a la causa', resp.message);
        this.linkingControlId = null;
        this.controlSearchTerm = '';
        this.loadReasonDetail();
      },
      error: (err: ErrorResponse) => {
        this.toast.showError('No se pudo vincular el control', err.message);
        this.linkingControlId = null;
      }
    });
  }

  onControlFormSaved(control: Control | undefined): void {
    if (!control) {
      return;
    }
    this.reasonService.linkControls(this.reason.id, [control.id]).subscribe({
      next: () => {
        this.addingControl = false;
        this.loadReasonDetail();
        this.controlsChanged.emit();
      },
      error: (err: ErrorResponse) => {
        this.toast.showError('No se pudo vincular el control creado', err.message);
      }
    });
  }

  onUnlinkControl(control: Control): void {
    const confirmDialog = DialogUtility.confirm({
      isModal: true,
      isDraggable: false,
      width: '450px',
      position: { X: 'center', Y: 'center' },
      title: 'Quitar el control - ' + control.code,
      content: '¿Está seguro que desea quitar este control de esta causa? El control no se elimina, solo se desvincula.',
      okButton: {
        isFlat: false,
        text: 'Quitar',
        click: () => {
          this.reasonService.unlinkControl(this.reason.id, control.id).subscribe({
            next: (response: SuccessResponse) => {
              this.toast.showSuccess('Control quitado de la causa', response.message);
              this.loadReasonDetail();
            },
            error: (error: ErrorResponse) => {
              this.toast.showError('No se pudo quitar el control', error.message);
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

  getOsLabel(os: string): string {
    return os === 'UBUNTU' ? 'Ubuntu' : 'Windows';
  }

  toggleChecksVisibility(controlId: string): void {
    if (this.expandedChecksIds.has(controlId)) {
      this.expandedChecksIds.delete(controlId);
    } else {
      this.expandedChecksIds.add(controlId);
    }
  }

  isChecksExpanded(controlId: string): boolean {
    return this.expandedChecksIds.has(controlId);
  }

  onRemoveFromRisk(): void {
    const confirmDialog = DialogUtility.confirm({
      isModal: true,
      isDraggable: false,
      width: '450px',
      position: { X: 'center', Y: 'center' },
      title: 'Quitar la causa - ' + this.reason.code,
      content: '¿Está seguro que desea quitar esta causa de este riesgo? La causa no se elimina, solo se desvincula.',
      okButton: {
        isFlat: false,
        text: 'Quitar',
        click: () => {
          this.reasonService.unlinkRisk(this.reason.id, this.riskId).subscribe({
            next: (response: SuccessResponse) => {
              this.toast.showSuccess('Causa quitada del riesgo', response.message);
              this.changed.emit();
            },
            error: (error: ErrorResponse) => {
              this.toast.showError('No se pudo quitar la causa', error.message);
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
