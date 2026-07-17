import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, output } from '@angular/core';
import { Router } from '@angular/router';
import { Template } from '@features/grc-framework/models/template.model';
import { TemplateService } from '@features/grc-framework/services/template.service';
import { ErrorResponse, SuccessResponse } from '@shared/models/api-response.model';
import { ToastService } from '@shared/services/toast.service';
import { DialogUtility } from '@syncfusion/ej2-angular-popups';

@Component({
  selector: 'app-template-list',
  imports: [CommonModule],
  templateUrl: './template-list.html',
  styleUrl: './template-list.css',
  changeDetection: ChangeDetectionStrategy.Default,
})
export class TemplateList {

  refreshTemplate = output();

  constructor(
    private toast: ToastService,
    private router: Router,
    public templateService: TemplateService
  ) { }

  onEditTemplate(template: Template) {
    this.router.navigate(['/templates', template.id]);
  }

  onDeleteTemplate(template: Template) {
    if (template) {
      const confirmDialog = DialogUtility.confirm({
        isModal: true,
        isDraggable: false,
        width: '450px',
        position: { X: 'center', Y: 'center' },
        title: 'Eliminar la plantilla - ' + template.code,
        content: '¿Está seguro que desea eliminar esta plantilla de forma permanente?',
        okButton: {
          isFlat: false,
          text: 'Eliminar',
          click: () => {
            this.templateService.deleteTemplate(template.id).subscribe({
              next: (response: SuccessResponse) => {
                this.toast.showSuccess('Plantilla eliminada correctamente', response.message);
                this.refreshTemplate.emit();
              },
              error: (error: ErrorResponse) => {
                this.toast.showError('No se pudo eliminar la plantilla', error.message);
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
