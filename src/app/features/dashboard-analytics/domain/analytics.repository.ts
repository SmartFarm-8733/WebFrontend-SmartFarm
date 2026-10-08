import { HerdOverview } from './analytics';

export abstract class AnalyticsRepository {
  abstract read(herdId: string, role: 'rancher' | 'veterinarian'): HerdOverview;
}
