import { ChangeDetectionStrategy, Component, ViewChild, input, output, signal } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { CodeInput } from '@core/presentation/components/code-input/code-input';

// Segunda confirmación de una acción grave: tras aprobar el formulario, se pide el código de 6 dígitos de la app de autenticación de quien actúa (D94, D97).
// Usa el mismo campo que el inicio de sesión y, como él, se envía solo al completar el sexto dígito (el botón del diálogo y Enter siguen sirviendo). El código es de un
// solo uso: quien abre el diálogo siempre lo encuentra vacío (`clear()` al terminar o cancelar) y, si el servidor lo rechaza, se limpia para escribir otro (`reset()`).
// El botón de confirmar vive en el diálogo: esta pieza expone `canSubmit`, `submit()`, `clear()` y `reset()`.
//   <app-step-up-form #stepUp [sending]="enviando" (confirmed)="enviar($event)" />
@Component({
  selector: 'app-step-up-form',
  imports: [TranslateModule, CodeInput],
  changeDetection: ChangeDetectionStrategy.Default,
  template: `
    <div class="flex flex-col items-center gap-3 px-2 pb-1 text-center" (keydown.enter)="submit()">
      <div class="w-full max-w-xs">
        <app-code-input #field [value]="code()" (valueChange)="code.set($event)" (complete)="onComplete($event)" [disabled]="sending()" [label]="'STEP_UP.LABEL' | translate"></app-code-input>
      </div>
      <p class="text-xs text-gray-500 dark:text-gray-400">{{ 'STEP_UP.HINT' | translate }}</p>
    </div>
  `,
})
export class StepUpForm {
  sending = input(false);
  confirmed = output<string>();

  @ViewChild('field') private field?: CodeInput;

  readonly code = signal('');

  get canSubmit(): boolean {
    return /^\d{6}$/.test(this.code()) && !this.sending();
  }

  submit(): void {
    if (this.canSubmit) this.confirmed.emit(this.code());
  }

  onComplete(code: string): void {
    this.code.set(code);
    this.submit();
  }

  /** Vacía el campo sin enfocarlo (al cerrar el diálogo). */
  clear(): void {
    this.code.set('');
  }

  /** Vacía el campo y devuelve el cursor a él; espera a que el campo vuelva a estar habilitado (mientras se envía está deshabilitado). */
  reset(): void {
    this.code.set('');
    setTimeout(() => this.field?.focus());
  }
}
