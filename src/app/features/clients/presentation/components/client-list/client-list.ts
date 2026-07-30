import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ProvisioningStatus } from '@features/clients/models/client.model';
import { ClientService } from '@features/clients/services/client.service';

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

@Component({
  selector: 'app-client-list',
  imports: [CommonModule],
  templateUrl: './client-list.html',
  styleUrl: './client-list.css',
  changeDetection: ChangeDetectionStrategy.Default,
})
export class ClientList {
  constructor(public clientService: ClientService) { }

  statusLabel(status: ProvisioningStatus): string {
    return STATUS_LABELS[status] ?? status;
  }

  statusClass(status: ProvisioningStatus): string {
    return STATUS_CLASSES[status] ?? '';
  }
}
