import { LocalDatePipe } from '@shared/presentation/pipes/local-date.pipe';
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { RegisteredCompany } from '@shared/models/company.model';

// D99 · La clave de acceso ya no se muestra: viaja por correo al administrativo. Este resumen dice si el correo salió (y hasta cuándo vale la clave).
// El título y el botón de reenviar una clave nueva, si no salió, los pone el modal de la vista, que hace la llamada; aquí solo se muestra el estado.
@Component({
  selector: 'app-access-key-sent',
  imports: [CommonModule, TranslateModule, LocalDatePipe],
  templateUrl: './access-key-sent.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccessKeySent {
  company = input.required<RegisteredCompany>();

  get failed(): boolean {
    return this.company().access_key.delivery_status === 'failed';
  }
}
