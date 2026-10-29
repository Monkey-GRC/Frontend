import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { TextBoxModule } from '@syncfusion/ej2-angular-inputs';

// Segunda confirmación de una acción grave: tras aprobar el formulario, se pide el código de 6 dígitos de la app de autenticación de quien actúa (D94, D95).
// El botón de confirmar vive en el diálogo: esta pieza expone `canSubmit`, `submit()` y `reset()`.
//   <app-step-up-form #stepUp [sending]="enviando" (confirmed)="enviar($event)" />
@Component({
  selector: 'app-step-up-form',
  imports: [TranslateModule, TextBoxModule],
  changeDetection: ChangeDetectionStrategy.Default,
  template: `
    <div class="flex flex-col gap-1">
      <label for="step-up-code">{{ 'STEP_UP.LABEL' | translate }} <span class="text-red-500">*</span></label>
      <ejs-textbox id="step-up-code" [value]="code()" (input)="onInput($event)" (keydown.enter)="submit()" placeholder="000000"
        floatLabelType="Never" cssClass="e-outline shadow-input" [enabled]="!sending()" autocomplete="one-time-code" inputmode="numeric" maxlength="6"></ejs-textbox>
      <p class="text-xs text-gray-500 dark:text-gray-400">{{ 'STEP_UP.HINT' | translate }}</p>
    </div>
  `,
})
export class StepUpForm {
  sending = input(false);
  confirmed = output<string>();

  readonly code = signal('');

  get canSubmit(): boolean {
    return /^\d{6}$/.test(this.code()) && !this.sending();
  }

  onInput(event: unknown): void {
    const value = (event as { value?: string })?.value ?? '';
    this.code.set(value.replace(/\D/g, '').slice(0, 6));
  }

  submit(): void {
    if (this.canSubmit) this.confirmed.emit(this.code());
  }

  reset(): void {
    this.code.set('');
  }
}
