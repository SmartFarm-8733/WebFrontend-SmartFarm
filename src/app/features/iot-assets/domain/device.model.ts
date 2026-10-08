export type DeviceType = 'collar' | 'water-controller' | 'gateway';
export type ConnectionState = 'online' | 'offline' | 'never-seen';
export type DeviceRole = 'rancher' | 'veterinarian';
export type ReleaseReason = 'maintenance' | 'animal-left-herd' | 'replacement';

export interface DeviceText {
  readonly en: string;
  readonly es: string;
}

export interface KnownAnimal {
  readonly id: string;
  readonly herdId: string;
  readonly earTag: string;
  readonly name: string;
}

export interface CollarAssignment {
  readonly animal: KnownAnimal;
  readonly startedAt: string;
  readonly endedAt: string | null;
  readonly reason: ReleaseReason | null;
}

interface DeviceBase {
  readonly id: string;
  readonly herdId: string;
  readonly type: DeviceType;
  readonly connection: ConnectionState;
  readonly battery: number | null;
  readonly capturedAt: string | null;
  readonly lastSeen: string | null;
  readonly firmware: string;
  readonly pendingReadings: number | null;
}

export interface CollarDevice extends DeviceBase {
  readonly type: 'collar';
  readonly assignment: CollarAssignment | null;
  readonly assignmentHistory: readonly CollarAssignment[];
  readonly temperatureC: number | null;
  readonly activity: DeviceText | null;
}

export interface WaterControllerDevice extends DeviceBase {
  readonly type: 'water-controller';
  readonly location: DeviceText;
  readonly temperatureC: number | null;
  readonly heaterStatus: 'on' | 'off' | 'unknown';
}

export interface GatewayDevice extends DeviceBase {
  readonly type: 'gateway';
  readonly location: DeviceText;
  readonly bufferedReadings: number | null;
}

export type IoTDevice = CollarDevice | WaterControllerDevice | GatewayDevice;

export interface DeviceAccess {
  readonly herdId: string;
  readonly role: DeviceRole;
}

export interface DeviceInventory {
  readonly authorized: boolean;
  readonly devices: readonly IoTDevice[];
  readonly animals: readonly KnownAnimal[];
  readonly plan: { readonly assigned: number; readonly limit: number; readonly source: 'demo' };
}

export type DeviceError = 'read-only' | 'unauthorized' | 'device-not-found' | 'not-collar'
  | 'already-assigned' | 'animal-not-found' | 'animal-already-linked' | 'plan-limit'
  | 'not-assigned' | 'reason-required' | 'invalid-time';

export type DeviceMutation = { readonly ok: true; readonly device: CollarDevice }
  | { readonly ok: false; readonly error: DeviceError };

export interface DeviceFilters {
  readonly identifier: string;
  readonly type: DeviceType | 'all';
  readonly connection: ConnectionState | 'all';
}

// TB1 thresholds, not clinical or hardware rules. Capture age and receipt age are independent.
export const STALE_CAPTURE_MS = 24 * 60 * 60 * 1000;
export const LOST_COMMUNICATION_MS = 48 * 60 * 60 * 1000;
export const LOW_BATTERY_PERCENT = 20;

export function isCaptureStale(device: IoTDevice, now: string): boolean {
  if (device.capturedAt === null) return false;
  const age = Date.parse(now) - Date.parse(device.capturedAt);
  return !Number.isFinite(age) || age < 0 || age > STALE_CAPTURE_MS;
}

export function connectionAt(device: IoTDevice, now: string): ConnectionState {
  if (device.lastSeen === null) return 'never-seen';
  const age = Date.parse(now) - Date.parse(device.lastSeen);
  return !Number.isFinite(age) || age < 0 || age > LOST_COMMUNICATION_MS ? 'offline' : device.connection;
}

export function isLowBattery(device: IoTDevice): boolean {
  return device.battery !== null && device.battery <= LOW_BATTERY_PERCENT;
}
