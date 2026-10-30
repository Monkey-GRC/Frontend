import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { RegisteredCompany } from '@features/companies/models/company.model';

// Muestra la clave de acceso recién emitida. Es la única vez que existe en claro: el envío por
// correo está aplazado (MD-69), así que admin_monkey la copia y la entrega por su canal.
@Component({
  selector: 'app-access-key-reveal',
  imports: [CommonModule, TranslateModule],
  templateUrl: './access-key-reveal.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccessKeyReveal {
  company = input.required<RegisteredCompany>();
  copied = signal(false);

  async copy(): Promise<void> {
    await navigator.clipboard.writeText(this.company().access_key.code);
    this.copied.set(true);
    setTimeout(() => this.copied.set(false), 2500);
  }
}
