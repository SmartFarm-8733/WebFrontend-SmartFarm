import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { LocaleService } from '../../../core/config/locale.service';
import { WorkspaceService } from '../../../core/config/workspace.service';
import { AnalyticsFacade } from '../application/analytics.facade';
import { AnalyticsRepository } from '../domain/analytics.repository';
import { DemoAnalyticsAdapter } from '../infrastructure/demo-analytics.adapter';

@Component({
  selector: 'ichu-reports', standalone: true,
  providers: [AnalyticsFacade, { provide: AnalyticsRepository, useExisting: DemoAnalyticsAdapter }],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './reports.page.html', styleUrl: './reports.page.scss',
})
export class ReportsPage {
  readonly locale = inject(LocaleService);
  readonly workspace = inject(WorkspaceService);
  readonly facade = inject(AnalyticsFacade);
  readonly feedback = signal(false);

  periodChanged(event: Event): void {
    if (event.target instanceof HTMLSelectElement) this.facade.period.set(event.target.value);
  }

  exportCsv(): void {
    const url = URL.createObjectURL(new Blob([this.facade.csv()], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `ichu-demo-${this.workspace.herdId()}-${this.facade.period()}.csv`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    this.feedback.set(true);
  }

  print(): void { window.print(); }
}
