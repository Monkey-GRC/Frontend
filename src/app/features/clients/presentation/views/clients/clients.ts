import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, ViewChild } from '@angular/core';
import { ClientList } from '@features/clients/presentation/components/client-list/client-list';
import { ClientForm } from '@features/clients/presentation/components/client-form/client-form';
import { DialogComponent } from '@shared/presentation/components/dialog/dialog';
import { CreateClientResult } from '@features/clients/models/client.model';
import { ClientService } from '@features/clients/services/client.service';
import { ToastService } from '@shared/services/toast.service';
import { SuccessResponse, ErrorResponse } from '@shared/models/api-response.model';
import { LoaderComponent } from '@shared/presentation/components/loader/loader.component';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-clients',
  imports: [
    CommonModule,
    ClientList,
    DialogComponent,
    ClientForm,
    TranslateModule,
    LoaderComponent
  ],
  templateUrl: './clients.html',
  styleUrl: './clients.css',
  changeDetection: ChangeDetectionStrategy.Default,
})
export class Clients implements OnInit {
  isVisible = false;
  isLoading = false;

  isRevealVisible = false;
  revealedApiKey: string | null = null;
  revealedClientName = '';
  copied = false;

  @ViewChild(ClientForm) clientForm!: ClientForm;

  constructor(
    public clientService: ClientService,
    private toast: ToastService,
  ) { }

  ngOnInit(): void {
    this.readAllClients();
  }

  onOpenModal() {
    this.isVisible = true;
  }

  onCloseModal() {
    this.isVisible = false;
  }

  onSubmitForm(result?: CreateClientResult) {
    this.isVisible = false;
    this.readAllClients();

    if (result) {
      this.revealedApiKey = result.api_key;
      this.revealedClientName = result.client.name;
      this.isRevealVisible = true;
    }
  }

  copyApiKey() {
    if (!this.revealedApiKey) return;
    navigator.clipboard.writeText(this.revealedApiKey).then(() => {
      this.copied = true;
      this.toast.showSuccess('Copiado', 'El api_key se copió al portapapeles');
      setTimeout(() => (this.copied = false), 2000);
    });
  }

  onCloseReveal() {
    this.isRevealVisible = false;
    // Nunca se vuelve a poder consultar — se limpia de memoria al cerrar.
    this.revealedApiKey = null;
    this.revealedClientName = '';
  }

  readAllClients() {
    this.isLoading = true;
    this.clientService.readAllClients().subscribe({
      next: (resp: SuccessResponse) => {
        this.clientService.clients = resp.data;
        this.isLoading = false;
      },
      error: (err: ErrorResponse) => {
        this.toast.showError('No se cargaron los tenants', err.message);
        this.isLoading = false;
      }
    })
  }

}
