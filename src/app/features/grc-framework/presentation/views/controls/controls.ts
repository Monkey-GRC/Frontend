import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, ViewChild } from '@angular/core';
import { ControlList } from '@features/grc-framework/presentation/components/control/control-list/control-list';
import { DialogComponent } from '@shared/presentation/components/dialog/dialog';
import { ControlForm } from '@features/grc-framework/presentation/components/control/control-form/control-form';
import { Control } from '@features/grc-framework/models/control.model';
import { ControlService } from '@features/grc-framework/services/control.service';
import { ToastService } from '@shared/services/toast.service';
import { SuccessResponse, ErrorResponse } from '@shared/models/api-response.model';
import { LoaderComponent } from '@shared/presentation/components/loader/loader.component';

@Component({
  selector: 'app-controls',
  imports: [
    CommonModule,
    ControlList,
    DialogComponent,
    ControlForm,
    LoaderComponent,
  ],
  templateUrl: './controls.html',
  styleUrl: './controls.css',
  changeDetection: ChangeDetectionStrategy.Default,
})
export class Controls implements OnInit {
  title: string = 'Crear un nuevo control';
  subtitle: string | null = 'En este formulario puede crear un nuevo control para luego poder asociarlo a los riesgos correspondientes';
  submitText: string = 'Crear control';
  isVisible: boolean = false;
  isLoading: boolean = false;

  constructor(
    public controlService: ControlService,
    private toast: ToastService,
  ) { }

  ngOnInit(): void {
    this.readAllControl();
  }

  @ViewChild(ControlForm) controlForm!: ControlForm;
  @ViewChild(ControlList) controlList!: ControlList;

  onOpenModal(action: 'create' | 'update', control?: Control) {
    this.controlForm.action = action;
    this.isVisible = true;
    if (action === 'update') {
      this.controlService.selectedControl = control!;
      this.title = `Editar el control - ${control?.name}`;
      this.subtitle = null;
      this.submitText = 'Actualizar control';
      this.controlService.initializeForm(control);
    }
  }

  onCloseModal() {
    this.isVisible = false;
    this.title = 'Crear un nuevo control';
    this.subtitle = 'En este formulario puede crear un nuevo control para luego poder asociarlo a los riesgos correspondientes';
    this.submitText = 'Crear control';
  }

  onSubmitForm() {
    this.isVisible = false;
    this.readAllControl();
  }

  readAllControl() {
    this.isLoading = true;
    this.controlService.readAllControl().subscribe({
      next: (resp: SuccessResponse) => {
        this.controlService.controls = resp.data;
        this.isLoading = false;
      },
      error: (err: ErrorResponse) => {
        this.toast.showError('No se cargaron los controles', err.message);
        this.isLoading = false;
      }
    });
  }
}
