import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { RiskForm } from '@features/grc-framework/presentation/components/risk/risk-form/risk-form';
import { RiskNode } from '@features/grc-framework/presentation/components/template/risk-node/risk-node';
import { TemplateForm } from '@features/grc-framework/presentation/components/template/template-form/template-form';
import { Control } from '@features/grc-framework/models/control.model';
import { Reason } from '@features/grc-framework/models/reason.model';
import { Risk } from '@features/grc-framework/models/risk.model';
import { Template } from '@features/grc-framework/models/template.model';
import { ControlService } from '@features/grc-framework/services/control.service';
import { ReasonService } from '@features/grc-framework/services/reason.service';
import { RiskService } from '@features/grc-framework/services/risk.service';
import { TemplateService } from '@features/grc-framework/services/template.service';
import { ErrorResponse, SuccessResponse } from '@shared/models/api-response.model';
import { LoaderComponent } from '@shared/presentation/components/loader/loader.component';
import { ToastService } from '@shared/services/toast.service';

@Component({
  selector: 'app-template-builder',
  imports: [
    CommonModule,
    TemplateForm,
    RiskForm,
    RiskNode,
    LoaderComponent,
  ],
  templateUrl: './template-builder.html',
  styleUrl: './template-builder.css',
  changeDetection: ChangeDetectionStrategy.Default,
})
export class TemplateBuilder implements OnInit {
  mode: 'create' | 'edit' = 'create';
  templateId: string | null = null;
  isLoading = false;

  allRisks: Risk[] = [];
  addingRisk = false;
  riskSearchTerm = '';
  linkingRiskId: string | null = null;

  allReasons: Reason[] = [];
  allControls: Control[] = [];

  @ViewChild(TemplateForm) templateForm?: TemplateForm;
  @ViewChild(RiskForm) riskForm?: RiskForm;

  constructor(
    public templateService: TemplateService,
    private riskService: RiskService,
    private reasonService: ReasonService,
    private controlService: ControlService,
    private route: ActivatedRoute,
    private router: Router,
    private toast: ToastService,
  ) { }

  ngOnInit(): void {
    this.templateId = this.route.snapshot.paramMap.get('id');
    this.mode = this.templateId ? 'edit' : 'create';

    if (this.templateId) {
      this.loadTemplate(this.templateId);
      this.loadAllRisks();
      this.loadAllReasons();
      this.loadAllControls();
    } else {
      this.templateService.selectedTemplate = null;
    }
  }

  loadTemplate(id: string): void {
    this.isLoading = true;
    this.templateService.readTemplate(id).subscribe({
      next: (resp: SuccessResponse) => {
        this.templateService.selectedTemplate = resp.data;
        this.isLoading = false;
      },
      error: (err: ErrorResponse) => {
        this.toast.showError('No se pudo cargar la plantilla', err.message);
        this.isLoading = false;
      }
    });
  }

  /** Refresca solo los riesgos de la plantilla, sin tocar el form de datos ni mostrar el loader de página completa */
  refreshTemplateRisks(): void {
    if (!this.templateId) {
      return;
    }
    this.templateService.readTemplate(this.templateId).subscribe({
      next: (resp: SuccessResponse) => {
        this.templateService.selectedTemplate = resp.data;
      },
      error: (err: ErrorResponse) => {
        this.toast.showError('No se pudo actualizar la lista de riesgos', err.message);
      }
    });
  }

  loadAllRisks(): void {
    this.riskService.readAllRisk().subscribe({
      next: (resp: SuccessResponse) => {
        this.allRisks = resp.data ?? [];
      },
      error: (err: ErrorResponse) => {
        this.toast.showError('No se pudieron cargar los riesgos', err.message);
      }
    });
  }

  loadAllReasons(): void {
    this.reasonService.readAllReason().subscribe({
      next: (resp: SuccessResponse) => {
        this.allReasons = resp.data ?? [];
      },
      error: (err: ErrorResponse) => {
        this.toast.showError('No se pudieron cargar las causas', err.message);
      }
    });
  }

  loadAllControls(): void {
    this.controlService.readAllControl().subscribe({
      next: (resp: SuccessResponse) => {
        this.allControls = resp.data ?? [];
      },
      error: (err: ErrorResponse) => {
        this.toast.showError('No se pudieron cargar los controles', err.message);
      }
    });
  }

  get availableRisks(): Risk[] {
    const term = this.riskSearchTerm.trim().toLowerCase();
    const linkedIds = new Set((this.templateService.selectedTemplate?.risks ?? []).map(r => r.id));
    return this.allRisks.filter(risk => !linkedIds.has(risk.id) && (!term || risk.name.toLowerCase().includes(term)));
  }

  onSearchRiskInput(event: Event): void {
    this.riskSearchTerm = (event.target as HTMLInputElement).value;
  }

  onToggleAddRisk(): void {
    this.addingRisk = !this.addingRisk;
  }

  onLinkRisk(risk: Risk): void {
    this.linkingRiskId = risk.id;
    this.riskService.updateRisk(risk.id, { templateId: this.templateId! }).subscribe({
      next: (resp: SuccessResponse) => {
        this.toast.showSuccess('Riesgo vinculado a la plantilla', resp.message);
        this.linkingRiskId = null;
        this.riskSearchTerm = '';
        this.refreshTemplateRisks();
      },
      error: (err: ErrorResponse) => {
        this.toast.showError('No se pudo vincular el riesgo', err.message);
        this.linkingRiskId = null;
      }
    });
  }

  onRiskChanged(): void {
    this.addingRisk = false;
    this.refreshTemplateRisks();
    this.loadAllRisks();
  }

  onSave(): void {
    this.templateForm?.onSubmit();
  }

  onTemplateSaved(template: Template): void {
    if (this.mode === 'create') {
      this.router.navigate(['/templates', template.id], { replaceUrl: true });
      return;
    }
    this.templateService.selectedTemplate = template;
  }

  goBack(): void {
    this.router.navigate(['/templates']);
  }
}
