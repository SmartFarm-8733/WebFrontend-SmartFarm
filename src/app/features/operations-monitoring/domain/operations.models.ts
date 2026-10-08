export type HerdRole = 'rancher' | 'veterinarian';
export type Freshness = 'recent' | 'stale' | 'disconnected' | 'missing';
export type AlertPriority = 'high' | 'medium' | 'low';
export type AlertStatus = 'open' | 'acknowledged' | 'resolved';
export type RecordKind = 'observation' | 'treatment' | 'vaccination' | 'review' | 'heat' | 'service' | 'calving';
export interface Copy { readonly en: string; readonly es: string; }
export interface AnimalReading {
  readonly id: string;
  readonly herdId: string;
  readonly name: string;
  readonly lot: Copy;
  readonly temperature: number | null;
  readonly rumination: number | null;
  readonly activity: number | null;
  readonly capturedAt: string | null;
  readonly syncedAt: string | null;
  readonly connected: boolean;
  readonly position: { readonly x: number; readonly y: number; readonly latitude: number; readonly longitude: number; readonly accuracy: number; readonly outside: boolean } | null;
  readonly samples: readonly { readonly capturedAt: string; readonly temperature: number }[];
}
export interface MonitoringAlert {
  readonly id: string;
  readonly herdId: string;
  readonly animalId: string;
  readonly priority: AlertPriority;
  readonly category: 'temperature' | 'activity' | 'location';
  readonly title: Copy;
  readonly detail: Copy;
  readonly raisedAt: string;
  readonly status: AlertStatus;
  readonly acknowledgedAt: string | null;
  readonly resolvedAt: string | null;
  readonly responseNote: string;
  readonly author: string;
}
export interface CareRecord {
  readonly id: string;
  readonly herdId: string;
  readonly animalId: string;
  readonly kind: RecordKind;
  readonly occurredAt: string;
  readonly note: Copy;
  readonly author: string;
  readonly product: string;
  readonly dose: string;
  readonly withdrawalStart: string | null;
  readonly withdrawalEnd: string | null;
  readonly withdrawalTarget: 'milk' | 'meat' | 'both' | null;
}
export interface NutritionLot {
  readonly id: string;
  readonly herdId: string;
  readonly name: Copy;
  readonly animals: number;
  readonly pastureTonnes: number;
  readonly pastureCapacity: number;
  readonly waterPercent: number | null;
  readonly waterTemperature: number | null;
  readonly heater: 'off' | 'reported-on' | 'unknown';
  readonly capturedAt: string | null;
  readonly syncedAt: string | null;
  readonly expectedWeight: number;
  readonly estimatedWeight: number;
  readonly cycleDay: number;
  readonly cycleDays: number;
}
export interface OperationsSnapshot {
  readonly animals: readonly AnimalReading[];
  readonly alerts: readonly MonitoringAlert[];
  readonly records: readonly CareRecord[];
  readonly lots: readonly NutritionLot[];
}
export interface CareRecordInput {
  readonly animalId: string;
  readonly kind: RecordKind;
  readonly occurredAt: string;
  readonly note: string;
  readonly product: string;
  readonly dose: string;
  readonly withdrawalStart: string;
  readonly withdrawalEnd: string;
  readonly withdrawalTarget: 'milk' | 'meat' | 'both';
  readonly withdrawalReviewed: boolean;
}
export type OperationError = 'access' | 'animal' | 'required' | 'date' | 'withdrawal' | 'withdrawal-review' | 'transition';
export type OperationResult = { readonly ok: true } | { readonly ok: false; readonly error: OperationError };
export const EMPTY_OPERATIONS: OperationsSnapshot = { animals: [], alerts: [], records: [], lots: [] };
export const REPRODUCTIVE_KINDS: readonly RecordKind[] = ['heat', 'service', 'calving'];
export const CLINICAL_KINDS: readonly RecordKind[] = ['treatment', 'vaccination', 'review', 'service'];

export function readingFreshness(reading: AnimalReading, now: string): Freshness {
  if (!reading.capturedAt) return 'missing';
  if (!reading.connected) return 'disconnected';
  return Date.parse(now) - Date.parse(reading.capturedAt) > 30 * 60_000 ? 'stale' : 'recent';
}

export function validDay(day: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(day) && new Date(`${day}T12:00:00Z`).toISOString().slice(0, 10) === day;
}
