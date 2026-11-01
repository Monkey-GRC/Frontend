import { Injectable, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AuthService } from '@features/auth/services/auth.service';

// Quién está en sesión, para cualquier feature que lo necesite (vive en core para que ninguna feature importe a auth). Es la misma interfaz de solo lectura que Monkey Platform
// expone con este nombre, así el código de Ajustes es el mismo en las dos apps.
@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly auth = inject(AuthService);

  readonly user = toSignal(this.auth.user$, { initialValue: this.auth.currentUser });
}
