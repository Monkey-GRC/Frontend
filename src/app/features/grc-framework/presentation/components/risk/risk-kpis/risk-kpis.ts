import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input, OnInit } from '@angular/core';
import { RiskService } from '@features/grc-framework/services/risk.service';
import { Risk } from '@features/grc-framework/models/risk.model'; // Asegúrate de importar el modelo

@Component({
  selector: 'app-risk-kpis',
  imports: [
    CommonModule
  ],
  templateUrl: './risk-kpis.html',
  styleUrl: './risk-kpis.css',
  changeDetection: ChangeDetectionStrategy.Default,
})
export class RiskKpis implements OnInit {


  @Input() risks: Risk[] = [];

  /* =========================
   * KPIs (dynamically calculated)
   * ========================= */
  kpis = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  };


  ngOnInit(): void {
    this.calculateKpis();
  }

  calculateKpis() {

    let critical = 0;
    let high = 0;
    let medium = 0;
    let low = 0;

    this.risks.forEach((risk: Risk) => {
      if (risk.level?.toLowerCase()!.includes('critical')) {
        critical++;
      } else if (risk.level?.toLowerCase().includes('high')) {
        high++;
      } else if (risk.level?.toLowerCase().includes('medium')) {
        medium++;
      } else if (risk.level?.toLowerCase().includes('low')) {
        low++;
      }

      this.kpis = {
        critical: critical,
        high: high,
        medium: medium,
        low: low,
      }

    })

  }
}