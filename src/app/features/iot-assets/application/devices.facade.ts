import { Injectable, computed, inject, signal } from '@angular/core';
import { WorkspaceService } from '../../../core/config/workspace.service';
import {
  DeviceAccess, DeviceError, DeviceFilters, DeviceMutation, IoTDevice, ReleaseReason,
  connectionAt, isCaptureStale, isLowBattery,
} from '../domain/device.model';
import { DeviceRepository } from '../domain/device.repository';

const DEFAULT_FILTERS: DeviceFilters = { identifier: '', type: 'all', connection: 'all' };

@Injectable()
export class DevicesFacade {
  private readonly repository = inject(DeviceRepository);
  private readonly workspace = inject(WorkspaceService);
  private readonly access = computed<DeviceAccess>(() => ({ herdId: this.workspace.herdId(), role: this.workspace.role() }));
  private readonly scope = computed(() => `${this.access().herdId}:${this.access().role}`);
  private readonly filterState = signal<{ scope: string; value: DeviceFilters } | null>(null);
  private readonly selection = signal<{ scope: string; id: string } | null>(null);
  private readonly feedback = signal<{ scope: string; value: 'linked' | 'released' | DeviceError } | null>(null);

  readonly inventory = computed(() => this.repository.inventory(this.access()));
  readonly readOnly = computed(() => this.workspace.role() !== 'rancher');
  readonly filters = computed(() => this.filterState()?.scope === this.scope() ? this.filterState()?.value ?? DEFAULT_FILTERS : DEFAULT_FILTERS);
  readonly message = computed(() => this.feedback()?.scope === this.scope() ? this.feedback()?.value ?? null : null);
  readonly filtered = computed(() => {
    const filters = this.filters();
    const query = filters.identifier.trim().toLocaleLowerCase();
    return this.inventory().devices.filter((device) =>
      (filters.type === 'all' || device.type === filters.type)
      && (filters.connection === 'all' || connectionAt(device, this.workspace.now) === filters.connection)
      && (!query || this.searchText(device).toLocaleLowerCase().includes(query)));
  });
  readonly selected = computed(() => {
    const selected = this.selection();
    if (selected?.scope === this.scope()) return this.inventory().devices.find((device) => device.id === selected.id) ?? null;
    return this.filtered()[0] ?? null;
  });
  readonly availableAnimals = computed(() => this.inventory().animals.filter((animal) =>
    !this.inventory().devices.some((device) => device.type === 'collar' && device.assignment?.animal.id === animal.id)));
  readonly stats = computed(() => {
    const devices = this.inventory().devices;
    return {
      online: devices.filter((device) => connectionAt(device, this.workspace.now) === 'online').length,
      offline: devices.filter((device) => connectionAt(device, this.workspace.now) === 'offline').length,
      lowBattery: devices.filter(isLowBattery).length,
      unknownBattery: devices.filter((device) => device.battery === null).length,
      stale: devices.filter((device) => isCaptureStale(device, this.workspace.now)).length,
    };
  });

  setFilters(value: DeviceFilters): void {
    this.filterState.set({ scope: this.scope(), value });
  }

  select(id: string): void {
    this.selection.set({ scope: this.scope(), id });
    this.feedback.set(null);
  }

  link(deviceId: string, animalId: string, expectedHerdId: string): boolean {
    return this.report(expectedHerdId !== this.access().herdId
      ? { ok: false, error: 'unauthorized' }
      : this.repository.assign(this.access(), deviceId, animalId, this.workspace.now), 'linked');
  }

  release(deviceId: string, reason: ReleaseReason, expectedHerdId: string): boolean {
    return this.report(expectedHerdId !== this.access().herdId
      ? { ok: false, error: 'unauthorized' }
      : this.repository.release(this.access(), deviceId, reason, this.workspace.now), 'released');
  }

  private report(result: DeviceMutation, success: 'linked' | 'released'): boolean {
    this.feedback.set({ scope: this.scope(), value: result.ok ? success : result.error });
    return result.ok;
  }

  private searchText(device: IoTDevice): string {
    return device.type === 'collar'
      ? `${device.id} ${device.assignment?.animal.earTag ?? ''} ${device.assignment?.animal.name ?? ''}`
      : `${device.id} ${device.location.en} ${device.location.es}`;
  }
}
