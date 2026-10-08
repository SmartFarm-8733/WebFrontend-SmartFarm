import { Injectable, signal } from '@angular/core';
import {
  CollarDevice, ConnectionState, DeviceAccess, DeviceError, DeviceInventory,
  DeviceMutation, IoTDevice, KnownAnimal, ReleaseReason,
} from '../domain/device.model';
import { DeviceRepository } from '../domain/device.repository';

export const DEMO_DEVICE_CAP = 12;
export const DEMO_AUTHORIZED_HERDS: readonly string[] = ['esperanza', 'pucara'];

const ANIMALS: readonly KnownAnimal[] = [
  { id: 'es-134', herdId: 'esperanza', earTag: 'ICH-134', name: 'Rocío' },
  { id: 'es-014', herdId: 'esperanza', earTag: 'ICH-014', name: 'Napoleón' },
  { id: 'es-089', herdId: 'esperanza', earTag: 'ICH-089', name: 'María' },
  { id: 'es-077', herdId: 'esperanza', earTag: 'ICH-077', name: '' },
  { id: 'es-095', herdId: 'esperanza', earTag: 'ICH-095', name: '' },
  { id: 'es-201', herdId: 'esperanza', earTag: 'ICH-201', name: 'Luna' },
  { id: 'es-063', herdId: 'esperanza', earTag: 'ICH-063', name: 'Blanca' },
  { id: 'es-118', herdId: 'esperanza', earTag: 'ICH-118', name: 'Estrella' },
  { id: 'pu-031', herdId: 'pucara', earTag: 'PUC-031', name: 'Lucero' },
  { id: 'pu-044', herdId: 'pucara', earTag: 'PUC-044', name: 'Nieve' },
];

function collar(
  id: string, animalId: string | null, battery: number | null, connection: ConnectionState,
  capturedAt: string | null, lastSeen: string | null, temperatureC: number | null,
  pendingReadings = 0, herdId = 'esperanza',
): CollarDevice {
  const animal = ANIMALS.find((entry) => entry.id === animalId);
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
    collar('CL-0134', 'es-134', 78, 'online', '2026-10-08T10:28:00-05:00', '2026-10-08T10:28:12-05:00', 38.5),
    collar('CL-0014', 'es-014', 64, 'online', '2026-10-08T10:26:00-05:00', '2026-10-08T10:26:07-05:00', 40.3),
    collar('CL-0089', 'es-089', 91, 'offline', '2026-10-08T06:30:00-05:00', '2026-10-08T06:31:00-05:00', 38.1, 412),
    collar('CL-0077', 'es-077', 12, 'online', '2026-10-08T10:29:00-05:00', '2026-10-08T10:29:05-05:00', 38.8),
    // A recent receipt does not make an old, buffered capture current.
    collar('CL-0095', 'es-095', 8, 'online', '2026-10-06T01:30:00-05:00', '2026-10-08T10:20:00-05:00', null, 1090),
    collar('CL-0021', null, null, 'never-seen', null, null, null),
    collar('CL-0007', 'es-201', 0, 'offline', '2026-10-05T08:00:00-05:00', '2026-10-05T08:01:00-05:00', 37.9),
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
    collar('CL-0301', 'pu-031', 53, 'offline', '2026-10-08T08:10:00-05:00', '2026-10-08T08:10:05-05:00', 38.4, 72, 'pucara'),
    collar('CL-0302', null, null, 'never-seen', null, null, null, 0, 'pucara'),
    {
      id: 'WT-0002', herdId: 'pucara', type: 'water-controller', connection: 'never-seen', battery: null,
      capturedAt: null, lastSeen: null, firmware: '1.3.0', pendingReadings: null,
      location: { en: 'South trough', es: 'Abrevadero sur' }, temperatureC: null, heaterStatus: 'unknown',
    },
  ];
}

@Injectable({ providedIn: 'root' })
export class MockDeviceAdapter extends DeviceRepository {
  private devices = seedDevices();
  private readonly updates = signal(0);
  readonly revision = this.updates.asReadonly();

  override inventory(access: DeviceAccess): DeviceInventory {
    this.revision();
    const authorized = this.authorized(access);
    const devices = authorized ? this.devices.filter((device) => device.herdId === access.herdId) : [];
    return structuredClone({
      authorized, devices,
      animals: authorized ? ANIMALS.filter((animal) => animal.herdId === access.herdId) : [],
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
    const animal = ANIMALS.find((entry) => entry.id === animalId && entry.herdId === access.herdId);
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
    return (access.role === 'rancher' || access.role === 'veterinarian') && DEMO_AUTHORIZED_HERDS.includes(access.herdId);
  }

  private writeError(access: DeviceAccess, at: string): DeviceError | null {
    if (!this.authorized(access)) return 'unauthorized';
    if (access.role !== 'rancher') return 'read-only';
    return Number.isFinite(Date.parse(at)) ? null : 'invalid-time';
  }
}
