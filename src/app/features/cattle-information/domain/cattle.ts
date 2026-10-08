export const LIFE_STAGES = ['calf', 'heifer', 'dairy', 'dry', 'breeding', 'fattening'] as const;
export const LOTS = ['lot-01', 'lot-03', 'lot-05', 'breeders'] as const;
export const EXIT_REASONS = ['sale', 'death', 'theft', 'culling'] as const;
export type LifeStage = typeof LIFE_STAGES[number];
export type Lot = typeof LOTS[number];
export type ExitReason = typeof EXIT_REASONS[number];
export type Sex = 'female' | 'male';
export type CattleError = 'duplicate-tag' | 'invalid-fields' | 'invalid-date' | 'invalid-stage' | 'inactive' | 'not-found' | 'read-only';
export type Result<T> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: CattleError; readonly existingId?: string };

export interface Registration {
  readonly tag: string;
  readonly name: string;
  readonly breed: string;
  readonly sex: Sex;
  readonly stage: LifeStage;
  readonly lot: Lot;
  readonly birthDate: string;
}

export interface StagePeriod {
  readonly stage: LifeStage;
  readonly from: string;
  readonly to: string | null;
}

export interface Collar {
  readonly id: string;
  readonly connection: 'connected' | 'disconnected';
  readonly lastSeen: string;
}

export interface Cattle extends Registration {
  readonly id: string;
  readonly herdId: string;
  readonly registeredAt: string;
  readonly status: 'active' | 'inactive';
  readonly health: 'healthy' | 'observation';
  readonly collar: Collar | null;
  readonly stages: readonly StagePeriod[];
  readonly exit: { readonly reason: ExitReason; readonly at: string; readonly releasedCollarId: string | null } | null;
}

export function normalizeTag(tag: string): string {
  return tag.trim().toUpperCase();
}

export function validDate(value: string, now: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value && value <= now.slice(0, 10);
}

export function validStageForSex(stage: LifeStage, sex: Sex): boolean {
  return LIFE_STAGES.includes(stage) && (sex === 'female' || sex === 'male') &&
    (sex === 'female' || !(['heifer', 'dairy', 'dry'] as readonly LifeStage[]).includes(stage));
}

export function validateRegistration(input: Registration, animals: readonly Cattle[], now: string): Result<Registration> {
  const clean = { ...input, tag: normalizeTag(input.tag), name: input.name.trim(), breed: input.breed.trim() };
  if (!/^[A-Z0-9][A-Z0-9-]{2,19}$/.test(clean.tag) || clean.name.length < 2 || clean.name.length > 60 ||
      clean.breed.length < 2 || clean.breed.length > 60 || !LOTS.includes(clean.lot)) {
    return { ok: false, error: 'invalid-fields' };
  }
  if (!validDate(clean.birthDate, now)) return { ok: false, error: 'invalid-date' };
  if (!validStageForSex(clean.stage, clean.sex)) return { ok: false, error: 'invalid-stage' };
  const existing = animals.find(animal => normalizeTag(animal.tag) === clean.tag);
  return existing ? { ok: false, error: 'duplicate-tag', existingId: existing.id } : { ok: true, value: clean };
}

export function changeStage(animal: Cattle, stage: LifeStage, at: string, now: string): Result<Cattle> {
  if (animal.status === 'inactive') return { ok: false, error: 'inactive' };
  if (stage === animal.stage || !validStageForSex(stage, animal.sex)) return { ok: false, error: 'invalid-stage' };
  const current = animal.stages.at(-1);
  if (!validDate(at, now) || !current || at < current.from) return { ok: false, error: 'invalid-date' };
  return { ok: true, value: { ...animal, stage, stages: [
    ...animal.stages.slice(0, -1), { ...current, to: at }, { stage, from: at, to: null },
  ] } };
}

export function deactivateCattle(animal: Cattle, reason: ExitReason, at: string, now: string): Result<Cattle> {
  if (animal.status === 'inactive') return { ok: false, error: 'inactive' };
  if (!EXIT_REASONS.includes(reason)) return { ok: false, error: 'invalid-fields' };
  const current = animal.stages.at(-1);
  if (!validDate(at, now) || !current || at < current.from) return { ok: false, error: 'invalid-date' };
  return { ok: true, value: { ...animal, status: 'inactive', collar: null,
    stages: [...animal.stages.slice(0, -1), { ...current, to: at }],
    exit: { reason, at, releasedCollarId: animal.collar?.id ?? null },
  } };
}
