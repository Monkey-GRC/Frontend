import { Injectable } from '@angular/core';
import { ToastComponent } from '@syncfusion/ej2-angular-notifications';
import { ToastUtility } from '@syncfusion/ej2-notifications';

@Injectable({
  providedIn: 'root'
})
export class ToastService {

  toastObj?: ToastComponent;

  private buildTemplate(icon: string, color: string, titulo: string, mensaje: string): string {
    return `
      <div class="flex items-start gap-3">
        <!-- Icono -->
        <span class="material-symbols-rounded ${color} text-2xl mt-0.5">
          ${icon}
        </span>

        <!-- Texto -->
        <div class="flex flex-col flex-1 gap-1">
          <span class="font-semibold text-white text-[15px]">${titulo}</span>
          <span class="text-[13px] text-white">${mensaje}</span>
        </div>
      </div>
    `;
  }

  showInfo(titulo: string, mensaje: string, duration: number = 3000) {
    this.toastObj = ToastUtility.show({
      cssClass: 'e-toast-info',
      template: this.buildTemplate('info', 'text-white', titulo, mensaje),
      position: { X: 'Right', Y: 'Bottom' },
      timeOut: duration
    }) as ToastComponent;
  }

  showSuccess(titulo: string, mensaje: string, duration: number = 3000) {
    this.toastObj = ToastUtility.show({
      cssClass: 'e-toast-success',
      template: this.buildTemplate('check_circle', 'text-white', titulo, mensaje),
      position: { X: 'Right', Y: 'Bottom' },
      timeOut: duration
    }) as ToastComponent;
  }

  showWarning(titulo: string, mensaje: string, duration: number = 3000) {
    this.toastObj = ToastUtility.show({
      cssClass: 'e-toast-warning',
      template: this.buildTemplate('warning', 'text-white', titulo, mensaje),
      position: { X: 'Right', Y: 'Bottom' },
      timeOut: duration
    }) as ToastComponent;
  }

  showError(titulo: string, mensaje: string, duration: number = 3000) {
    this.toastObj = ToastUtility.show({
      cssClass: 'e-toast-danger',
      template: this.buildTemplate('cancel', 'text-white', titulo, mensaje),
      position: { X: 'Right', Y: 'Bottom' },
      timeOut: duration
    }) as ToastComponent;
  }
}
