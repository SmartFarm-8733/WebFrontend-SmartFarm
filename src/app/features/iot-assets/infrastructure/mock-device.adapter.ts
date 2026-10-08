import { Injectable, signal } from '@angular/core';
import {
  CollarDevice, ConnectionState, DeviceAccess, DeviceError, DeviceInventory,
  DeviceMutation, IoTDevice, KnownAnimal, ReleaseReason,
} from '../domain/device.model';
import { DeviceRepository } from '../domain/device.repository';

export const DEMO_DEVICE_CAP = 12;
export const DEMO_RANCHER_HERDS: readonly string[] = ['esperanza', 'pucara'];

export const DEMO_ANIMALS: readonly KnownAnimal[] = [
  { id: 'lucero', herdId: 'esperanza', earTag: 'ICH-118', name: 'Lucero' },
  { id: 'margarita', herdId: 'esperanza', earTag: 'ICH-104', name: 'Margarita' },
  { id: 'canela', herdId: 'esperanza', earTag: 'ICH-126', name: 'Canela' },
  { id: 'brisa', herdId: 'esperanza', earTag: 'ICH-132', name: 'Brisa' },
  { id: 'toro', herdId: 'esperanza', earTag: 'ICH-109', name: 'Toro' },
  { id: 'rocio', herdId: 'esperanza', earTag: 'ICH-134', name: 'Rocío' },
  { id: 'maria', herdId: 'esperanza', earTag: 'ICH-089', name: 'María' },
  { id: 'napoleon', herdId: 'esperanza', earTag: 'ICH-014', name: 'Napoleón' },
  { id: 'alba', herdId: 'esperanza', earTag: 'ICH-201', name: 'Alba' },
  { id: 'pucara-luna', herdId: 'pucara', earTag: 'ICH-118', name: 'Luna' },
  { id: 'pucara-inti', herdId: 'pucara', earTag: 'ICH-210', name: 'Inti' },
];

export function isDeviceAccessAuthorized(access: DeviceAccess): boolean {
  if (access.role === 'rancher') return DEMO_RANCHER_HERDS.includes(access.herdId);
  return access.role === 'veterinarian' && access.herdId === 'esperanza';
}

function collar(
  id: string, animalId: string | null, battery: number | null, connection: ConnectionState,
  capturedAt: string | null, lastSeen: string | null, temperatureC: number | null,
  pendingReadings = 0, herdId = 'esperanza',
): CollarDevice {
  const animal = DEMO_ANIMALS.find((entry) => entry.id === animalId);
  return {
    id, herdId, type: 'collar', connection, battery, capturedAt, lastSeen, temperatureC,
    firmware: '2.4.1', pendingReadings,
    activity: capturedAt === null ? null : { en: 'Grazing', es: 'Pastoreo' },
    assignment: animal ? { animal, startedAt: '2026-03-01T09:00:00-05:00', endedAt: null, reason: null } : null,
    assignmentHistory: [],
  };
}

function seedDevices(): IoTDevice[] {
  return [
    collar('CL-0134', 'rocio', 78, 'online', '2026-10-08T10:28:00-05:00', '2026-10-08T10:28:12-05:00', 38.5),
    collar('CL-0014', 'napoleon', 64, 'online', '2026-10-08T10:26:00-05:00', '2026-10-08T10:26:07-05:00', 40.3),
    collar('CL-0089', 'maria', 91, 'offline', '2026-10-08T06:30:00-05:00', '2026-10-08T06:31:00-05:00', 38.1, 412),
    collar('CL-0077', null, 12, 'online', '2026-10-08T10:29:00-05:00', '2026-10-08T10:29:05-05:00', 38.8),
    // A recent receipt does not make an old, buffered capture current.
    collar('CL-0095', null, 8, 'online', '2026-10-06T01:30:00-05:00', '2026-10-08T10:20:00-05:00', null, 1090),
    collar('CL-0118', 'lucero', 76, 'online', '2026-10-08T10:27:00-05:00', '2026-10-08T10:27:08-05:00', 38.4),
    collar('CL-0104', 'margarita', 82, 'online', '2026-10-08T10:25:00-05:00', '2026-10-08T10:25:07-05:00', 38.2),
    collar('CL-0132', 'brisa', 12, 'offline', '2026-10-08T06:20:00-05:00', '2026-10-08T06:22:00-05:00', 38.8),
    collar('CL-0109', 'toro', 64, 'online', '2026-10-08T10:26:00-05:00', '2026-10-08T10:26:07-05:00', 38.6),
    collar('CL-0021', null, null, 'never-seen', null, null, null),
    collar('CL-0007', null, 0, 'offline', '2026-10-05T08:00:00-05:00', '2026-10-05T08:01:00-05:00', 37.9),
    {
      id: 'WT-0001', herdId: 'esperanza', type: 'water-controller', connection: 'online', battery: null,
      capturedAt: '2026-10-08T10:25:00-05:00', lastSeen: '2026-10-08T10:25:08-05:00',
      firmware: '1.3.0', pendingReadings: 0, location: { en: 'North trough', es: 'Abrevadero norte' },
      temperatureC: 14.2, heaterStatus: 'on',
    },
    {
      id: 'GW-0001', herdId: 'esperanza', type: 'gateway', connection: 'online', battery: 86,
      capturedAt: '2026-10-08T10:27:00-05:00', lastSeen: '2026-10-08T10:27:10-05:00',
      firmware: '1.8.2', pendingReadings: 0, location: { en: 'Main pasture', es: 'Potrero principal' }, bufferedReadings: 216,
    },
    collar('CL-0210', 'pucara-luna', 53, 'online', '2026-10-08T08:10:00-05:00', '2026-10-08T08:10:05-05:00', 38.4, 72, 'pucara'),
    collar('CL-0301', null, 53, 'offline', '2026-10-08T08:10:00-05:00', '2026-10-08T08:10:05-05:00', 38.4, 72, 'pucara'),
    collar('CL-0302', null, null, 'never-seen', null, null, null, 0, 'pucara'),
    {
      id: 'WT-0002', herdId: 'pucara', type: 'water-controller', connection: 'never-seen', battery: null,
      capturedAt: null, lastSeen: null, firmware: '1.3.0', pendingReadings: null,
      location: { en: 'South trough', es: 'Abrevadero sur' }, temperatureC: null, heaterStatus: 'unknown',
    },
  ];
}

export const DEMO_DEVICE_FIXTURES: readonly IoTDevice[] = seedDevices();

@Injectable({ providedIn: 'root' })
export class MockDeviceAdapter extends DeviceRepository {
  private devices: IoTDevice[] = DEMO_DEVICE_FIXTURES.map((device) => structuredClone(device));
  private readonly updates = signal(0);
  readonly revision = this.updates.asReadonly();

  override inventory(access: DeviceAccess): DeviceInventory {
    this.revision();
    const authorized = this.authorized(access);
    const devices = authorized ? this.devices.filter((device) => device.herdId === access.herdId) : [];
    return structuredClone({
      authorized, devices,
      animals: authorized ? DEMO_ANIMALS.filter((animal) => animal.herdId === access.herdId) : [],
      plan: { assigned: devices.filter((device) => device.type === 'collar' && device.assignment !== null).length,
        limit: DEMO_DEVICE_CAP, source: 'demo' },
    });
  }

  override assign(access: DeviceAccess, deviceId: string, animalId: string, at: string): DeviceMutation {
    const permission = this.writeError(access, at);
    if (permission) return { ok: false, error: permission };
    const device = this.devices.find((entry) => entry.id === deviceId && entry.herdId === access.herdId);
    if (!device) return { ok: false, error: 'device-not-found' };
    if (device.type !== 'collar') return { ok: false, error: 'not-collar' };
    if (device.assignment) return { ok: false, error: 'already-assigned' };
    const animal = DEMO_ANIMALS.find((entry) => entry.id === animalId && entry.herdId === access.herdId);
    if (!animal) return { ok: false, error: 'animal-not-found' };
    const inventory = this.inventory(access);
    if (inventory.devices.some((entry) => entry.type === 'collar' && entry.assignment?.animal.id === animalId)) {
      return { ok: false, error: 'animal-already-linked' };
    }
    if (inventory.plan.assigned >= inventory.plan.limit) return { ok: false, error: 'plan-limit' };
    return this.save({ ...device, assignment: { animal, startedAt: at, endedAt: null, reason: null } });
  }

  override release(access: DeviceAccess, deviceId: string, reason: ReleaseReason, at: string): DeviceMutation {
    const permission = this.writeError(access, at);
    if (permission) return { ok: false, error: permission };
    const device = this.devices.find((entry) => entry.id === deviceId && entry.herdId === access.herdId);
    if (!device) return { ok: false, error: 'device-not-found' };
    if (device.type !== 'collar') return { ok: false, error: 'not-collar' };
    if (!device.assignment) return { ok: false, error: 'not-assigned' };
    if (!['maintenance', 'animal-left-herd', 'replacement'].includes(reason)) return { ok: false, error: 'reason-required' };
    if (Date.parse(at) < Date.parse(device.assignment.startedAt)) return { ok: false, error: 'invalid-time' };
    return this.save({ ...device, assignment: null,
      assignmentHistory: [...device.assignmentHistory, { ...device.assignment, endedAt: at, reason }] });
  }

  private save(device: CollarDevice): DeviceMutation {
    this.devices = this.devices.map((entry) => entry.id === device.id && entry.herdId === device.herdId ? device : entry);
    this.updates.update((revision) => revision + 1);
    return { ok: true, device: structuredClone(device) };
  }

  private authorized(access: DeviceAccess): boolean {
    return isDeviceAccessAuthorized(access);
  }

  private writeError(access: DeviceAccess, at: string): DeviceError | null {
    if (!this.authorized(access)) return 'unauthorized';
    if (access.role !== 'rancher') return 'read-only';
    return Number.isFinite(Date.parse(at)) ? null : 'invalid-time';
  }
}
