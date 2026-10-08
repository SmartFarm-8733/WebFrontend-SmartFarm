import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LocaleService } from '../../../core/config/locale.service';
import { WorkspaceService } from '../../../core/config/workspace.service';
import { Icon } from '../../../shared/presentation/icon';
import { AnalyticsFacade } from '../application/analytics.facade';
import { AnalyticsRepository } from '../domain/analytics.repository';
import { DemoAnalyticsAdapter } from '../infrastructure/demo-analytics.adapter';

@Component({
  selector: 'ichu-dashboard', standalone: true,
  imports: [RouterLink, Icon],
  providers: [AnalyticsFacade, { provide: AnalyticsRepository, useExisting: DemoAnalyticsAdapter }],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard.page.html', styleUrl: './dashboard.page.scss',
})
export class DashboardPage {
  readonly locale = inject(LocaleService);
  readonly workspace = inject(WorkspaceService);
  readonly facade = inject(AnalyticsFacade);

  stage(value: string): string {
    const names: Record<string, [string, string]> = { dairy: ['Dairy cow', 'Vaca lechera'], dry: ['Dry cow', 'Vaca seca'], calf: ['Calf', 'Ternero'], heifer: ['Heifer', 'Vaquillona'], breeding: ['Breeding', 'Reproductor'], fattening: ['Finishing', 'Engorde'] };
    const pair = names[value] ?? ['Animal', 'Animal'];
    return this.locale.text(pair[0], pair[1]);
  }
}
