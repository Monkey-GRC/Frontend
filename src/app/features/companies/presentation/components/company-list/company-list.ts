import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, output } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { AccessKeyStatus } from '@features/companies/models/company.model';
import { CompanyService } from '@features/companies/services/company.service';

const KEY_STATUS_CLASSES: Record<AccessKeyStatus, string> = {
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  used: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  expired: 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
  revoked: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

@Component({
  selector: 'app-company-list',
  imports: [CommonModule, TranslateModule],
  templateUrl: './company-list.html',
  changeDetection: ChangeDetectionStrategy.Default,
})
export class CompanyList {
  pageChange = output<number>();

  constructor(public companyService: CompanyService) {}

  keyStatusClass(status: AccessKeyStatus | null): string {
    return status ? KEY_STATUS_CLASSES[status] : KEY_STATUS_CLASSES.expired;
  }
}
