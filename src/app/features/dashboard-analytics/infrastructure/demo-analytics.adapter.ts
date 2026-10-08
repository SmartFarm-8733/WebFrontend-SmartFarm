import { Injectable, inject } from '@angular/core';
import { OverviewSource } from '../domain/analytics';
import { AnalyticsRepository } from '../domain/analytics.repository';

@Injectable({ providedIn: 'root' })
export class DemoAnalyticsAdapter extends AnalyticsRepository {
  private readonly source = inject(OverviewSource);
  override read(herdId: string, role: 'rancher' | 'veterinarian') {
    return this.source.read(herdId, role);
  }
}
