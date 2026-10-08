export interface OverviewAnimal {
  readonly id: string; readonly tag: string; readonly name: string;
  readonly stage: string; readonly lot: string; readonly active: boolean;
  readonly collar: 'connected' | 'disconnected' | 'none';
}
export interface OverviewAlert {
  readonly id: string; readonly tag: string; readonly priority: 'high' | 'medium' | 'low';
  readonly status: string; readonly title: { readonly en: string; readonly es: string };
  readonly at: string;
}
export interface OverviewCampaign {
  readonly id: string; readonly name: { readonly en: string; readonly es: string };
  readonly date: string; readonly progress: number; readonly status: string;
}
export interface HerdOverview {
  readonly animals: readonly OverviewAnimal[];
  readonly alerts: readonly OverviewAlert[];
  readonly campaigns: readonly OverviewCampaign[];
  readonly connectedDevices: number;
  readonly deviceCount: number;
  readonly capturedAt: string;
}
export abstract class OverviewSource {
  abstract read(herdId: string, role: 'rancher' | 'veterinarian'): HerdOverview;
}
export interface PeriodMetrics {
  readonly activeAnimals: number; readonly connectedCollars: number;
  readonly openAlerts: number; readonly highPriority: number; readonly inactiveAnimals: number;
  readonly completedCampaigns: number; readonly plannedCampaigns: number;
}
export function deriveMetrics(snapshot: HerdOverview): PeriodMetrics {
  return {
    activeAnimals: snapshot.animals.filter(animal => animal.active).length,
    connectedCollars: snapshot.animals.filter(animal => animal.active && animal.collar === 'connected').length,
    openAlerts: snapshot.alerts.filter(alert => alert.status !== 'resolved').length,
    highPriority: snapshot.alerts.filter(alert => alert.status !== 'resolved' && alert.priority === 'high').length,
    inactiveAnimals: snapshot.animals.filter(animal => !animal.active).length,
    completedCampaigns: snapshot.campaigns.filter(campaign => campaign.status === 'completed').length,
    plannedCampaigns: snapshot.campaigns.length,
  };
}
export function csvCell(value: string | number): string {
  const text = String(value);
  const safe = /^\s*[=+\-@]|^[\t\r\n]/.test(text) ? "'" + text : text;
  return '"' + safe.replaceAll('"', '""') + '"';
}
