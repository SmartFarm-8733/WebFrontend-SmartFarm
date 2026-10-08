import { expect, test } from '@playwright/test';
import {
  changeStage,
  deactivateCattle,
  normalizeTag,
  validDate,
  validStageForSex,
  validateRegistration,
} from '../../src/app/features/cattle-information/domain/cattle';
import type { Cattle, ExitReason, LifeStage, Registration } from '../../src/app/features/cattle-information/domain/cattle';

const now = '2026-10-08T10:30:00-05:00';

function sampleCattle(overrides: Partial<Cattle> = {}): Cattle {
  return {
    id: 'lucero',
    herdId: 'esperanza',
    tag: 'ICH-118',
    name: 'Lucero',
    breed: 'Holstein',
    sex: 'female',
    stage: 'dairy',
    lot: 'lot-03',
    birthDate: '2022-10-08',
    registeredAt: '2022-10-08',
    status: 'active',
    health: 'healthy',
    collar: { id: 'CL-0118', connection: 'connected', lastSeen: '2026-10-08T10:15:00-05:00' },
    stages: [{ stage: 'dairy', from: '2022-10-08', to: null }],
    exit: null,
    ...overrides,
  };
}

function sampleRegistration(overrides: Partial<Registration> = {}): Registration {
  return {
    tag: 'ich-205',
    name: '  New Cow  ',
    breed: '  Brown Swiss  ',
    sex: 'female',
    stage: 'heifer',
    lot: 'lot-01',
    birthDate: '2025-03-20',
    ...overrides,
  };
}

test.describe('cattle domain helpers', () => {
  test('normalizes tags and accepts only real dates through today', () => {
    expect(normalizeTag('  ich-118  ')).toBe('ICH-118');
    expect(validDate('2026-10-08', now)).toBe(true);
    expect(validDate('2024-02-29', now)).toBe(true);
    expect(validDate('2026-02-30', now)).toBe(false);
    expect(validDate('2026-10-09', now)).toBe(false);
    expect(validDate('2026-10-08T00:00:00Z', now)).toBe(false);
  });

  test('allows life stages that match the animal sex', () => {
    expect(validStageForSex('heifer', 'female')).toBe(true);
    expect(validStageForSex('dairy', 'female')).toBe(true);
    expect(validStageForSex('calf', 'male')).toBe(true);
    expect(validStageForSex('breeding', 'male')).toBe(true);
    expect(validStageForSex('heifer', 'male')).toBe(false);
    expect(validStageForSex('dairy', 'male')).toBe(false);
    expect(validStageForSex('dry', 'male')).toBe(false);
    expect(validStageForSex('unknown' as LifeStage, 'female')).toBe(false);
  });

  test('validates and normalizes registration fields, including herd-local tag uniqueness', () => {
    const accepted = validateRegistration(sampleRegistration(), [], now);
    expect(accepted.ok).toBe(true);
    if (!accepted.ok) throw new Error(`Unexpected registration error: ${accepted.error}`);
    expect(accepted.value).toEqual({
      ...sampleRegistration(),
      tag: 'ICH-205',
      name: 'New Cow',
      breed: 'Brown Swiss',
    });

    expect(validateRegistration(sampleRegistration({ tag: ' ich-118 ' }), [sampleCattle()], now)).toEqual({
      ok: false,
      error: 'duplicate-tag',
      existingId: 'lucero',
    });
    expect(validateRegistration(sampleRegistration({ tag: 'ICH 205' }), [], now)).toMatchObject({ ok: false, error: 'invalid-fields' });
    expect(validateRegistration(sampleRegistration({ birthDate: '2026-02-30' }), [], now)).toMatchObject({ ok: false, error: 'invalid-date' });
    expect(validateRegistration(sampleRegistration({ sex: 'male', stage: 'dairy' }), [], now)).toMatchObject({ ok: false, error: 'invalid-stage' });
  });

  test('changes stages only when the animal and effective date are valid', () => {
    const original = sampleCattle();
    const changed = changeStage(original, 'dry', '2026-09-01', now);
    expect(changed.ok).toBe(true);
    if (!changed.ok) throw new Error(`Unexpected stage change error: ${changed.error}`);
    expect(changed.value.stages).toEqual([
      { stage: 'dairy', from: '2022-10-08', to: '2026-09-01' },
      { stage: 'dry', from: '2026-09-01', to: null },
    ]);
    expect(original.stages[0].to).toBeNull();

    expect(changeStage(original, 'dairy', '2026-09-01', now)).toMatchObject({ ok: false, error: 'invalid-stage' });
    expect(changeStage(sampleCattle({ sex: 'male' }), 'dairy', '2026-09-01', now)).toMatchObject({ ok: false, error: 'invalid-stage' });
    expect(changeStage(original, 'dry', '2022-10-07', now)).toMatchObject({ ok: false, error: 'invalid-date' });
    expect(changeStage(original, 'dry', '2026-10-09', now)).toMatchObject({ ok: false, error: 'invalid-date' });
    expect(changeStage(sampleCattle({ status: 'inactive' }), 'dry', '2026-09-01', now)).toMatchObject({ ok: false, error: 'inactive' });
  });

  test('deactivates cattle with a valid reason and date while retaining the exit history', () => {
    const result = deactivateCattle(sampleCattle(), 'sale', '2026-10-02', now);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(`Unexpected deactivation error: ${result.error}`);
    expect(result.value).toMatchObject({
      status: 'inactive',
      collar: null,
      stages: [{ stage: 'dairy', from: '2022-10-08', to: '2026-10-02' }],
      exit: { reason: 'sale', at: '2026-10-02', releasedCollarId: 'CL-0118' },
    });

    expect(deactivateCattle(sampleCattle(), 'sale', '2022-10-07', now)).toMatchObject({ ok: false, error: 'invalid-date' });
    expect(deactivateCattle(sampleCattle(), 'unknown' as ExitReason, '2026-10-02', now)).toMatchObject({ ok: false, error: 'invalid-fields' });
    expect(deactivateCattle(sampleCattle({ status: 'inactive' }), 'sale', '2026-10-02', now)).toMatchObject({ ok: false, error: 'inactive' });
  });
});
