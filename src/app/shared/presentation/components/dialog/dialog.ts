// components/reusable-dialog/reusable-dialog.component.ts
import { Component, Input, Output, EventEmitter, TemplateRef, ContentChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogModule } from '@syncfusion/ej2-angular-popups';

@Component({
  selector: 'app-dialog',
  standalone: true,
  imports: [CommonModule, DialogModule],
  templateUrl: './dialog.html'
})
export class DialogComponent {
  // Inputs básicos
  @Input() width: string = '700px';
  @Input() visible: boolean = false;
  @Input() showCloseIcon: boolean = true;
  @Input() isModal: boolean = true;
  @Input() allowDragging: boolean = true;

  // Inputs de contenido
  @Input() title: string = '';
  @Input() subtitle: string = '';
  @Input() icon: string = '';

  // Inputs de botones
  @Input() submitText: string = 'Guardar';
  @Input() cancelText: string = 'Cancelar';
  @Input() isSubmitting: boolean = false;

  // Eventos
  @Output() onClose = new EventEmitter<void>();
  @Output() onSubmit = new EventEmitter<void>();

  // Para contenido personalizado (opcional)
  @ContentChild('customFooter', { static: false }) customFooter?: TemplateRef<any>;
}