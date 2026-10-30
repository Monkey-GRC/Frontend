import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { RegisteredCompany } from '@features/companies/models/company.model';

// D99 · La clave de acceso ya no se muestra: viaja por correo al administrativo. Este resumen dice si el correo salió y,
// si no salió, ofrece reenviar una clave nueva. La vista hace la llamada; aquí solo se muestra el estado.
@Component({
  selector: 'app-access-key-sent',
  imports: [CommonModule, TranslateModule],
  templateUrl: './access-key-sent.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccessKeySent {
  company = input.required<RegisteredCompany>();
  sending = input(false);
  resend = output<void>();

  get failed(): boolean {
    return this.company().access_key.delivery_status === 'failed';
  }
}
