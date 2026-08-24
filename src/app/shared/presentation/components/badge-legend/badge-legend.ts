import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

/**
 * Modal informativo, reutilizable, que explica que significa cada bandera
 * de color que aparece sobre un check CIS (estado + mapeo a marcos).
 * Pensado para un auditor que no necesariamente conoce a fondo Wazuh o los
 * frameworks de cumplimiento -- ver también monkey-brain-ai/docs/flujo-negocio-riesgos-causas-controles.md
 */
@Component({
  selector: 'app-badge-legend',
  imports: [CommonModule],
  templateUrl: './badge-legend.html',
  styleUrl: './badge-legend.css',
  changeDetection: ChangeDetectionStrategy.Default,
})
export class BadgeLegend {
  @Input() visible = false;
  @Output() closed = new EventEmitter<void>();

  close(): void {
    this.closed.emit();
  }
}
