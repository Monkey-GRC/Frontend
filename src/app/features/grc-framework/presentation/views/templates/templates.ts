import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { TemplateList } from '@features/grc-framework/presentation/components/template/template-list/template-list';
import { TemplateService } from '@features/grc-framework/services/template.service';
import { ErrorResponse, SuccessResponse } from '@shared/models/api-response.model';
import { LoaderComponent } from '@shared/presentation/components/loader/loader.component';
import { ToastService } from '@shared/services/toast.service';

@Component({
  selector: 'app-templates',
  imports: [
    CommonModule,
    TemplateList,
    LoaderComponent,
  ],
  templateUrl: './templates.html',
  styleUrl: './templates.css',
  changeDetection: ChangeDetectionStrategy.Default,
})
export class Templates implements OnInit {
  isLoading = false;

  constructor(
    public templateService: TemplateService,
    private toast: ToastService,
    private router: Router,
  ) { }

  ngOnInit(): void {
    this.readAllTemplate();
  }

  onCreateTemplate(): void {
    this.router.navigate(['/templates/new']);
  }

  readAllTemplate(): void {
    this.isLoading = true;
    this.templateService.readAllTemplate().subscribe({
      next: (resp: SuccessResponse) => {
        this.templateService.templates = resp.data;
        this.isLoading = false;
      },
      error: (err: ErrorResponse) => {
        this.toast.showError('No se cargaron las plantillas', err.message);
        this.isLoading = false;
      }
    });
  }
}
