import { Injectable, inject } from '@angular/core';
import { CattleRepository } from '../../features/cattle-information/domain/cattle.repository';
import { HerdOverview, OverviewSource } from '../../features/dashboard-analytics/domain/analytics';
import { DeviceRepository } from '../../features/iot-assets/domain/device.repository';
import { connectionAt } from '../../features/iot-assets/domain/device.model';
import { OperationsRepository } from '../../features/operations-monitoring/domain/operations.repository';
import { PlanningRepository } from '../../features/planning/domain/planning.repository';
import { campaignProgress } from '../../features/planning/domain/planning.models';
import { WorkspaceService } from './workspace.service';

/** Composition boundary: analytics consumes snapshots, not another context's components. */
@Injectable({ providedIn: 'root' })
export class ComposedOverviewSource extends OverviewSource {
  private readonly cattle = inject(CattleRepository);
  private readonly operations = inject(OperationsRepository);
  private readonly planning = inject(PlanningRepository);
  private readonly devices = inject(DeviceRepository);
  private readonly workspace = inject(WorkspaceService);

  override read(herdId: string, role: 'rancher' | 'veterinarian'): HerdOverview {
    this.cattle.revision;
    this.planning.revision();
    const context = { herdId, role };
    const animals = this.cattle.list(herdId);
    const inventory = this.devices.inventory(context);
    const operations = this.operations.read(herdId, role);
    const planning = this.planning.read(context);
    return {
      animals: animals.map(animal => {
        const collar = inventory.devices.find(device => device.type === 'collar' && device.assignment?.animal.id === animal.id);
        return {
          id: animal.id, tag: animal.tag, name: animal.name, stage: animal.stage,
          lot: animal.lot, active: animal.status === 'active',
          collar: !collar ? 'none' : connectionAt(collar, this.workspace.now) === 'online' ? 'connected' : 'disconnected',
        };
      }),
      alerts: operations.alerts.map(alert => ({
        id: alert.id, tag: alert.animalId, priority: alert.priority, status: alert.status,
        title: alert.title, at: alert.raisedAt,
      })),
      campaigns: planning.campaigns.map(campaign => ({
        id: campaign.id, name: campaign.name, date: campaign.date,
        progress: campaignProgress(campaign), status: campaign.status,
      })),
      connectedDevices: inventory.devices.filter(device => connectionAt(device, this.workspace.now) === 'online').length,
      deviceCount: inventory.devices.length,
      capturedAt: this.workspace.now,
    };
  }
}
