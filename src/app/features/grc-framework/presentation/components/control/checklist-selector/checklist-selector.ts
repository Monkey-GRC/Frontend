import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { ChecklistCheck, ChecklistOS } from '@features/grc-framework/models/checklist.model';
import { ChecklistService } from '@features/grc-framework/services/checklist.service';
import { ControlService } from '@features/grc-framework/services/control.service';
import { ErrorResponse, SuccessResponse } from '@shared/models/api-response.model';
import { ToastService } from '@shared/services/toast.service';

@Component({
  selector: 'app-checklist-selector',
  imports: [CommonModule],
  templateUrl: './checklist-selector.html',
  styleUrl: './checklist-selector.css',
  changeDetection: ChangeDetectionStrategy.Default,
})
export class ChecklistSelector implements OnInit {
  allChecks: ChecklistCheck[] = [];
  searchTerm = '';
  loading = false;

  constructor(
    public controlService: ControlService,
    private checklistService: ChecklistService,
    private toast: ToastService,
  ) { }

  ngOnInit(): void {
    const currentOs = this.controlService.form.get('os')?.value ?? null;
    if (currentOs) {
      this.loadChecklist(currentOs);
    }
  }

  get selectedChecks(): ChecklistCheck[] {
    return this.controlService.form.get('checklist')?.value ?? [];
  }

  get filteredChecks(): ChecklistCheck[] {
    const term = this.searchTerm.trim().toLowerCase();
    if (!term) {
      return this.allChecks;
    }
    return this.allChecks.filter(check => check.title.toLowerCase().includes(term));
  }

  onOsSelect(event: Event): void {
    const value = (event.target as HTMLSelectElement).value as ChecklistOS | '';
    const os = value || null;

    this.controlService.form.get('os')?.setValue(os);
    this.controlService.form.get('checklist')?.setValue([]);
    this.searchTerm = '';
    this.loadChecklist(os);
  }

  onSearchInput(event: Event): void {
    this.searchTerm = (event.target as HTMLInputElement).value;
  }

  isChecked(check: ChecklistCheck): boolean {
    return this.selectedChecks.some(c => c.checkId === check.checkId);
  }

  toggleCheck(check: ChecklistCheck): void {
    const current = this.selectedChecks;
    const updated = this.isChecked(check)
      ? current.filter(c => c.checkId !== check.checkId)
      : [...current, check];

    this.controlService.form.get('checklist')?.setValue(updated);
  }

  private loadChecklist(os: ChecklistOS | null): void {
    this.allChecks = [];
    if (!os) {
      return;
    }

    this.loading = true;
    this.checklistService.getChecklist(os).subscribe({
      next: (resp: SuccessResponse<ChecklistCheck[]>) => {
        this.allChecks = resp.data ?? [];
        this.loading = false;
      },
      error: (err: ErrorResponse) => {
        this.toast.showError('No se pudo cargar el checklist', err.message);
        this.loading = false;
      }
    });
  }
}
