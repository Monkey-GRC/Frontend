import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnInit, output } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { RiskService } from '@features/grc-framework/services/risk.service';
import { ErrorResponse, SuccessResponse } from '@shared/models/api-response.model';
import { ToastService } from '@shared/services/toast.service';
import { NumericTextBoxModule, TextAreaModule, TextBoxModule } from '@syncfusion/ej2-angular-inputs'

@Component({
  selector: 'app-risk-form',
  imports: [CommonModule, ReactiveFormsModule, TextAreaModule, TextBoxModule, NumericTextBoxModule],
  templateUrl: './risk-form.html',
  styleUrl: './risk-form.css',
  changeDetection: ChangeDetectionStrategy.Default,
})
export class RiskForm implements OnInit {
  /** Template al que se asocia el riesgo al crearlo (uso dentro del árbol de Templates) */
  @Input() templateId?: string | null;

  /** Emite evento cuando se necesita recargar la lista de riesgos */
  sendedForm = output();

  /** Estado del formulario */
  sendingForm = false;
  action: 'create' | 'update' = 'create';

  constructor(
    public riskService: RiskService,
    private toast: ToastService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    if (this.action === 'create') {
      this.riskService.selectedRisk = null;
    }
    this.riskService.initializeForm(undefined, this.templateId);
  }

  /** Calcula el nivel de riesgo basado en impacto + probabilidad */
  getRiskLevel(): RiskLevel {
    const score = this.calculateRiskScore();

    if (score >= 8) return 'Crítico';
    if (score >= 6) return 'Alto';
    if (score >= 5) return 'Medio';
    if (score <= 4) return 'Bajo';
    return 'No evaluado';
  }

  /** Calcula la puntuación total (impacto + probabilidad) */
  calculateRiskScore(): number {
    const impact = this.riskService.form.get('impact')?.value || 0;
    const probability = this.riskService.form.get('probability')?.value || 0;
    return impact + probability;
  }

  /** Calcula porcentaje para la barra de progreso */
  calculateRiskPercentage(): number {
    return (this.calculateRiskScore() / 10) * 100;
  }

  /** Actualiza la UI cuando cambian los valores */
  refreshRiskView(): void {
    this.cdr.detectChanges();
  }

  // =================== GESTIÓN DEL FORMULARIO ===================

  /** Maneja el envío del formulario */
  async onSubmit(): Promise<void> {
    if (this.riskService.form.invalid) {
      this.sendingForm = false;
      return;
    }

    this.sendingForm = true;
    const body = this.buildRequestBody();
    const request = this.getRequestFunction(body);

    try {
      const resp = await this.executeRequest(request);
      this.handleSuccess(resp);
    } catch (err) {
      this.handleError(err as ErrorResponse);
    }
  }

  /** Construye el body a enviar, omitiendo templateId si no aplica */
  private buildRequestBody(): any {
    const body = { ...this.riskService.form.value };
    if (!body.templateId) {
      delete body.templateId;
    }
    return body;
  }

  /** Determina qué función de servicio usar según la acción */
  private getRequestFunction(body: any) {
    return this.action === 'create' && !this.riskService.selectedRisk!.id
      ? () => this.riskService.createRisk(body)
      : () => this.riskService.updateRisk(this.riskService.selectedRisk!.id, body);
  }

  /** Ejecuta la petición HTTP */
  private async executeRequest(requestFn: Function): Promise<SuccessResponse> {
    return new Promise((resolve, reject) => {
      requestFn().subscribe({
        next: (resp: SuccessResponse) => resolve(resp),
        error: (err: ErrorResponse) => reject(err)
      });
    });
  }

  /** Maneja respuesta exitosa */
  private handleSuccess(resp: SuccessResponse): void {
    const actionText = this.action === 'create' ? 'creado' : 'actualizado';
    this.toast.showSuccess(`Riesgo ${actionText}`, resp.message);
    this.finalizeOperation();
  }

  /** Maneja error */
  private handleError(err: ErrorResponse): void {
    const actionText = this.action === 'create' ? 'crear' : 'actualizar';
    this.toast.showError(`Error al ${actionText} riesgo`, err.message);
    this.finalizeOperation();
  }

  /** Finaliza la operación (éxito o error) */
  private finalizeOperation(): void {
    this.sendingForm = false;
    this.sendedForm.emit();
    if (this.action === 'create') {
      this.resetForm();
    }
  }

  /** Resetea el formulario a estado inicial */
  private resetForm(): void {
    this.riskService.initializeForm();
    this.action = 'create';
    this.riskService.selectedRisk = null;
  }
}

/** Tipos de niveles de riesgo */
type RiskLevel = 'Crítico' | 'Alto' | 'Medio' | 'Bajo' | 'No evaluado';