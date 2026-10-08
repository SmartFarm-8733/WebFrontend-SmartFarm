import { Injectable, computed, inject, signal } from '@angular/core';
import { WorkspaceService } from '../../../core/config/workspace.service';
import { AnalyticsRepository } from '../domain/analytics.repository';
import { csvCell, deriveMetrics } from '../domain/analytics';

@Injectable()
export class AnalyticsFacade {
  private readonly repository = inject(AnalyticsRepository);
  private readonly workspace = inject(WorkspaceService);
  readonly period = signal('2026-10');
  readonly snapshot = computed(() => this.repository.read(this.workspace.herdId(), this.workspace.role()));
  readonly metrics = computed(() => deriveMetrics(this.snapshot()));
  readonly prioritizedAlerts = computed(() => this.snapshot().alerts.filter(alert => alert.status !== 'resolved').sort((a, b) => (a.priority === 'high' ? 0 : 1) - (b.priority === 'high' ? 0 : 1)).slice(0, 3));
  readonly selectedCampaigns = computed(() => this.snapshot().campaigns.filter(campaign => campaign.date.startsWith(this.period())));
  readonly coverage = computed(() => {
    const count = this.metrics().activeAnimals;
    return count ? Math.round(this.metrics().connectedCollars / count * 100) : 0;
  });

  csv(): string {
    const rows: (string | number)[][] = [['ICHU herd report', this.workspace.herdName(), this.period()], ['Campaign', 'Date', 'Progress (%)', 'Status']];
    for (const campaign of this.selectedCampaigns()) rows.push([campaign.name.en, campaign.date, campaign.progress, campaign.status]);
    rows.push([], ['Current inventory (not historical)'], ['Active animals', this.metrics().activeAnimals], ['Open alerts', this.metrics().openAlerts], ['Connected collars', this.metrics().connectedCollars]);
    return '\uFEFF' + rows.map(row => row.map(csvCell).join(',')).join('\r\n');
  }
}
