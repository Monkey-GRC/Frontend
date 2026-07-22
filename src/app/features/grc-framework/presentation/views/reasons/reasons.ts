import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, ViewChild } from '@angular/core';
import { ReasonList } from '@features/grc-framework/presentation/components/reason/reason-list/reason-list';
import { ReasonForm } from '@features/grc-framework/presentation/components/reason/reason-form/reason-form';
import { DialogComponent } from '@shared/presentation/components/dialog/dialog';
import { Reason } from '@features/grc-framework/models/reason.model';
import { TranslateModule } from '@ngx-translate/core';
import { ReasonService } from '@features/grc-framework/services/reason.service';
import { ToastService } from '@shared/services/toast.service';
import { SuccessResponse, ErrorResponse } from '@shared/models/api-response.model';
import { LoaderComponent } from '@shared/presentation/components/loader/loader.component';

@Component({
  selector: 'app-reasons',
  imports: [
    CommonModule,
    ReasonList,
    DialogComponent,
    ReasonForm,
    TranslateModule,
    LoaderComponent
  ],
  templateUrl: './reasons.html',
  styleUrl: './reasons.css',
  changeDetection: ChangeDetectionStrategy.Default,
})
export class Reasons implements OnInit {
  title: string = 'Crear una nueva causa';
  subtile: string | null = 'En este formulario puede crear una nueva causa para luego poder asociarla y construir las plantillas necesarias';
  submitText: string = 'Crear causa';
  action: 'create' | 'update' = 'create';
  isVisible: boolean = false;
  isLoading: boolean = false;

  constructor(
    public reasonService: ReasonService,
    private toast: ToastService,
  ) { }


  ngOnInit(): void {
    this.readAllReason();
  }

  @ViewChild(ReasonForm) reasonForm!: ReasonForm;
  @ViewChild(ReasonList) reasonList!: ReasonList;

  onOpenModal(action: 'create' | 'update', reason?: Reason) {
    this.reasonForm.action = action;
    this.isVisible = true;
    if (action === 'update') {
      this.reasonService.selectedReason = reason!;
      this.title = `Editar la causa - ${reason?.name}`
      this.subtile = null;
      this.submitText = 'Actualizar causa'
      this.reasonService.initializeForm(reason);
    }
  }

  onCloseModal() {
    this.isVisible = false;
    this.title = 'Crear una nueva causa';
    this.subtile = 'En este formulario puede crear una nueva causa para luego poder asociarla y construir las plantillas necesarias';
    this.submitText = 'Crear causa';
    this.action = 'create';
  }

  onSubmitForm() {
    this.isVisible = false;
    this.readAllReason();
  }

  readAllReason() {
    this.isLoading = true;
    this.reasonService.readAllReason().subscribe({
      next: (resp: SuccessResponse) => {
        this.reasonService.reasons = resp.data;
        this.isLoading = false;
      },
      error: (err: ErrorResponse) => {
        this.toast.showError('No se cargaron las causas', err.message);
        this.isLoading = false;
      }
    })
  }

}
