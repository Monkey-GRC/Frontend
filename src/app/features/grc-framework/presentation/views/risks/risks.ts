import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, ViewChild } from '@angular/core';
import { RiskList } from '@features/grc-framework/presentation/components/risk/risk-list/risk-list';
import { RiskMatriz } from '@features/grc-framework/presentation/components/risk/risk-matriz/risk-matriz';
import { RiskKpis } from '@features/grc-framework/presentation/components/risk/risk-kpis/risk-kpis';
import { DialogComponent } from "@shared/presentation/components/dialog/dialog";
import { RiskForm } from '@features/grc-framework/presentation/components/risk/risk-form/risk-form';
import { Risk } from '@features/grc-framework/models/risk.model';
import { TranslateModule } from '@ngx-translate/core';
import { RiskService } from '@features/grc-framework/services/risk.service';
import { ToastService } from '@shared/services/toast.service';
import { SuccessResponse, ErrorResponse } from '@shared/models/api-response.model';
import { LoaderComponent } from '@shared/presentation/components/loader/loader.component';

@Component({
  selector: 'app-risks',
  imports: [
    CommonModule,
    RiskList,
    RiskMatriz,
    RiskKpis,
    DialogComponent,
    RiskForm,
    TranslateModule,
    LoaderComponent
],
  templateUrl: './risks.html',
  styleUrl: './risks.css',
  changeDetection: ChangeDetectionStrategy.Default,
})
export class Risks implements OnInit {
  title: string = 'Crear un nuevo riesgo';
  subtile: string | null = 'En este formulario puede crear un nuevo riego para luego poder asociarlo y construir las plantillas necesarias';
  submitText: string = 'Crear riesgo';
  action: 'create' | 'update' = 'create';
  isVisible: boolean = false;
  isLoading: boolean = false;

  constructor(
    public riskService: RiskService,
    private toast: ToastService,
  ) { }


  ngOnInit(): void {
    this.readAllRisk();
  }

  @ViewChild(RiskForm) riskForm!: RiskForm;
  @ViewChild(RiskList) riskList!: RiskList;
  @ViewChild(RiskMatriz) riskMatriz!: RiskMatriz;
  @ViewChild(RiskKpis) riskKpis!: RiskKpis;

  onOpenModal(action: 'create' | 'update', risk?: Risk) {
    this.riskForm.action = action;
    this.isVisible = true;
    if (action === 'update') {
      this.riskService.selectedRisk = risk!;
      this.title = `Editar el riesgo - ${risk?.name}`
      this.subtile = null;
      this.submitText = 'Actualizar riesgo'
      this.riskService.initializeForm(risk);
    }
  }

  onCloseModal() {
    this.isVisible = false;
    this.title = 'Crear un nuevo riesgo';
    this.subtile = 'En este formulario puede crear un nuevo riego para luego poder asociarlo y construir las plantillas necesarias';
    this.submitText = 'Crear riesgo';
    this.action = 'create';
  }

  onSubmitForm() {
    this.isVisible = false;
    this.readAllRisk();
  }

  readAllRisk() {
    this.isLoading = true;
    this.riskService.readAllRisk().subscribe({
      next: (resp: SuccessResponse) => {
        this.riskService.risks = resp.data;
        this.isLoading = false;
      },
      error: (err: ErrorResponse) => {
        this.toast.showError('No se cargaron riesgos', err.message);
        this.isLoading = false;
      }
    })
  }

}
