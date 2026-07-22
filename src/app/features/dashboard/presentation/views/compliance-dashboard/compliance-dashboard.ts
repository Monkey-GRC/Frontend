import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import { DashboardService } from '@features/dashboard/services/dashboard.service';
import { CheckResult, DashboardControl, DashboardControlCheck, DashboardSummary } from '@features/dashboard/models/dashboard.model';
import { ToastService } from '@shared/services/toast.service';
import { SuccessResponse, ErrorResponse } from '@shared/models/api-response.model';
import { LoaderComponent } from '@shared/presentation/components/loader/loader.component';

@Component({
  selector: 'app-compliance-dashboard',
  imports: [
    CommonModule,
    LoaderComponent,
  ],
  templateUrl: './compliance-dashboard.html',
  styleUrl: './compliance-dashboard.css',
  changeDetection: ChangeDetectionStrategy.Default,
})
export class ComplianceDashboard implements OnInit {
  isLoading = signal<boolean>(false);
  summary = signal<DashboardSummary | null>(null);
  controls = signal<DashboardControl[]>([]);
  expandedControlId = signal<string | null>(null);
  checksByControl = signal<Record<string, DashboardControlCheck[]>>({});
  loadingChecksId = signal<string | null>(null);

  compliantControlsLabel = computed(() => {
    const data = this.summary();
    if (!data) return '';
    return `${data.controlsCompliant} / ${data.controlsTotal}`;
  });

  constructor(
    private dashboardService: DashboardService,
    private toast: ToastService,
  ) { }

  ngOnInit(): void {
    this.readDashboard();
  }

  readDashboard() {
    this.isLoading.set(true);
    this.checksByControl.set({});
    this.expandedControlId.set(null);
    forkJoin({
      summary: this.dashboardService.readSummary(),
      controls: this.dashboardService.readControls(),
    }).subscribe({
      next: (resp: { summary: SuccessResponse, controls: SuccessResponse }) => {
        this.summary.set(resp.summary.data);
        this.controls.set(resp.controls.data ?? []);
        this.isLoading.set(false);
      },
      error: (err: ErrorResponse) => {
        this.toast.showError('No se cargó el dashboard de cumplimiento', err.message);
        this.isLoading.set(false);
      }
    });
  }

  onToggleControl(id: string) {
    const isClosing = this.expandedControlId() === id;
    this.expandedControlId.set(isClosing ? null : id);
    if (!isClosing && !this.checksByControl()[id]) {
      this.readControlChecks(id);
    }
  }

  readControlChecks(id: string) {
    this.loadingChecksId.set(id);
    this.dashboardService.readControlChecks(id).subscribe({
      next: (resp: SuccessResponse) => {
        this.checksByControl.update(current => ({ ...current, [id]: resp.data?.checks ?? [] }));
        this.loadingChecksId.set(null);
      },
      error: (err: ErrorResponse) => {
        this.toast.showError('No se cargó el detalle de checks', err.message);
        this.loadingChecksId.set(null);
      }
    });
  }

  getResultBadge(result: CheckResult): { icon: string, iconClasses: string, badgeClasses: string, label: string } {
    switch (result) {
      case 'passed':
        return {
          icon: 'check_circle',
          iconClasses: 'text-success-600 dark:text-success-400',
          badgeClasses: 'bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-400',
          label: 'Cumple'
        };
      case 'failed':
        return {
          icon: 'cancel',
          iconClasses: 'text-error-600 dark:text-error-400',
          badgeClasses: 'bg-error-50 text-error-700 dark:bg-error-500/15 dark:text-error-400',
          label: 'Fallido'
        };
      default:
        return {
          icon: 'do_not_disturb_on',
          iconClasses: 'text-gray-400 dark:text-gray-500',
          badgeClasses: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
          label: 'No aplica'
        };
    }
  }

  getComplianceColor(percentage: number | null): string {
    if (percentage === null) return 'text-gray-400 dark:text-gray-500';
    if (percentage >= 90) return 'text-success-600 dark:text-success-400';
    if (percentage >= 60) return 'text-warning-600 dark:text-warning-400';
    return 'text-error-600 dark:text-error-400';
  }

  getComplianceBarColor(percentage: number | null): string {
    if (percentage === null) return 'bg-gray-300 dark:bg-gray-600';
    if (percentage >= 90) return 'bg-success-500';
    if (percentage >= 60) return 'bg-warning-500';
    return 'bg-error-500';
  }
}
