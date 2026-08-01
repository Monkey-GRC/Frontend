import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, output } from '@angular/core';
import { Client, DocumentType, ProvisioningStatus } from '@features/clients/models/client.model';
import { ClientService } from '@features/clients/services/client.service';
import {
  ErrorResponse,
  SuccessResponse,
} from '@shared/models/api-response.model';
import { ToastService } from '@shared/services/toast.service';
import { DialogUtility } from '@syncfusion/ej2-angular-popups';

const STATUS_LABELS: Record<ProvisioningStatus, string> = {
  PENDING: 'Pendiente',
  PROVISIONING: 'Aprovisionando',
  READY: 'Listo',
  FAILED: 'Falló',
};

const STATUS_CLASSES: Record<ProvisioningStatus, string> = {
  PENDING: 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
  PROVISIONING: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  READY: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  FAILED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  NIT: 'NIT',
  RUC: 'RUC',
  CEDULA: 'Cédula',
  PASAPORTE: 'Pasaporte',
  OTRO: 'Otro',
};

@Component({
  selector: 'app-client-list',
  imports: [CommonModule],
  templateUrl: './client-list.html',
  styleUrl: './client-list.css',
  changeDetection: ChangeDetectionStrategy.Default,
})
export class ClientList {
  refreshClients = output();
  regenerated = output<{ client: Client; onboarding_code: string }>();

  constructor(
    public clientService: ClientService,
    private toast: ToastService,
  ) { }

  statusLabel(status: ProvisioningStatus): string {
    return STATUS_LABELS[status] ?? status;
  }

  statusClass(status: ProvisioningStatus): string {
    return STATUS_CLASSES[status] ?? '';
  }

  documentTypeLabel(type: DocumentType): string {
    return DOCUMENT_TYPE_LABELS[type] ?? type;
  }

  onRegenerateCode(client: Client) {
    const confirmDialog = DialogUtility.confirm({
      isModal: true,
      isDraggable: false,
      width: '450px',
      position: { X: 'center', Y: 'center' },
      title: 'Regenerar código - ' + client.name,
      content:
        '¿Está seguro que desea regenerar el código de onboarding? El código anterior dejará de funcionar.',
      okButton: {
        isFlat: false,
        text: 'Regenerar',
        click: () => {
          this.clientService.regenerateOnboardingCode(client.id).subscribe({
            next: (response: SuccessResponse) => {
              this.toast.showSuccess('Código regenerado correctamente', response.message);
              this.regenerated.emit(response.data);
            },
            error: (error: ErrorResponse) => {
              this.toast.showError('No se pudo regenerar el código', error.message);
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

  onDeactivateClient(client: Client) {
    const confirmDialog = DialogUtility.confirm({
      isModal: true,
      isDraggable: false,
      width: '450px',
      position: { X: 'center', Y: 'center' },
      title: 'Desactivar cliente - ' + client.name,
      content:
        '¿Está seguro que desea desactivar a este cliente? Perderá acceso a la API de inmediato. Podrá reactivarlo más adelante.',
      okButton: {
        isFlat: false,
        text: 'Desactivar',
        click: () => {
          this.clientService.deactivateClient(client.id).subscribe({
            next: (response: SuccessResponse) => {
              this.toast.showSuccess('Cliente desactivado correctamente', response.message);
              this.refreshClients.emit();
            },
            error: (error: ErrorResponse) => {
              this.toast.showError('No se pudo desactivar el cliente', error.message);
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

  onReactivateClient(client: Client) {
    this.clientService.reactivateClient(client.id).subscribe({
      next: (response: SuccessResponse) => {
        this.toast.showSuccess('Cliente reactivado correctamente', response.message);
        this.refreshClients.emit();
      },
      error: (error: ErrorResponse) => {
        this.toast.showError('No se pudo reactivar el cliente', error.message);
      },
    });
  }
}
