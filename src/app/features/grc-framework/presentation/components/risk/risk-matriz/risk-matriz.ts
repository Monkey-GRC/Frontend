import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-risk-matriz',
  imports: [
    CommonModule
  ],
  templateUrl: './risk-matriz.html',
  styleUrl: './risk-matriz.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RiskMatriz {

  /* =========================
   * Matriz de riesgos (5x5)
   * ========================= */
  riskMatrix: any[] = [
    // prob 5
    { probability: 5, impact: 1, color: 'bg-yellow-300' },
    { probability: 5, impact: 2, color: 'bg-orange-300' },
    { probability: 5, impact: 3, color: 'bg-red-400', count: 1 },
    { probability: 5, impact: 4, color: 'bg-red-500' },
    { probability: 5, impact: 5, color: 'bg-red-600' },

    // prob 4
    { probability: 4, impact: 1, color: 'bg-yellow-200' },
    { probability: 4, impact: 2, color: 'bg-yellow-300' },
    { probability: 4, impact: 3, color: 'bg-orange-400', count: 1 },
    { probability: 4, impact: 4, color: 'bg-red-400' },
    { probability: 4, impact: 5, color: 'bg-red-500', count: 2 },

    // prob 3
    { probability: 3, impact: 1, color: 'bg-green-300' },
    { probability: 3, impact: 2, color: 'bg-yellow-200' },
    { probability: 3, impact: 3, color: 'bg-yellow-300', count: 1 },
    { probability: 3, impact: 4, color: 'bg-orange-400', count: 1 },
    { probability: 3, impact: 5, color: 'bg-red-400' },

    // prob 2
    { probability: 2, impact: 1, color: 'bg-green-300' },
    { probability: 2, impact: 2, color: 'bg-green-400' },
    { probability: 2, impact: 3, color: 'bg-yellow-200', count: 1 },
    { probability: 2, impact: 4, color: 'bg-yellow-300', count: 1 },
    { probability: 2, impact: 5, color: 'bg-orange-400' },

    // prob 1
    { probability: 1, impact: 1, color: 'bg-green-400' },
    { probability: 1, impact: 2, color: 'bg-green-400' },
    { probability: 1, impact: 3, color: 'bg-green-300' },
    { probability: 1, impact: 4, color: 'bg-yellow-200' },
    { probability: 1, impact: 5, color: 'bg-yellow-300' },
  ];

}
