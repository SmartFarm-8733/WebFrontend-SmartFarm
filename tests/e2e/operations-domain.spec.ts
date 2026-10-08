import { expect, test } from '@playwright/test';
import { CareRecordInput, validDay } from '../../src/app/features/operations-monitoring/domain/operations.models';
import { MockOperationsAdapter } from '../../src/app/features/operations-monitoring/infrastructure/mock-operations.adapter';

const demoNow = '2026-10-08T10:30:00-05:00';

function careInput(overrides: Partial<CareRecordInput> = {}): CareRecordInput {
  return {
    animalId: 'ICH-118',
    kind: 'treatment',
    occurredAt: '2026-10-08',
    note: 'Recorded demo intervention',
    product: 'DEMO-NEW',
    dose: '5 mL · demo',
    withdrawalStart: '2026-10-08',
    withdrawalEnd: '2026-10-12',
    withdrawalTarget: 'both',
    withdrawalReviewed: false,
    ...overrides,
  };
}

test('validDay rejects malformed and impossible calendar dates without throwing', () => {
  for (const day of ['', '2026-2-08', '2026-10-8', '2026-02-30', '2026-13-01', '2026-00-10', '2026-99-99', 'not-a-date']) {
    expect(() => validDay(day), day).not.toThrow();
    expect(validDay(day), day).toBe(false);
  }

  expect(validDay('2024-02-29')).toBe(true);
  expect(validDay('2026-10-08')).toBe(true);
  expect(validDay('2026-02-29')).toBe(false);
});

test('adapter restricts veterinarians to their linked herd and separates field from clinical records', () => {
  const adapter = new MockOperationsAdapter();

  expect(adapter.read('pucara', 'veterinarian').animals).toHaveLength(0);
  expect(adapter.record('pucara', 'veterinarian', careInput(), demoNow)).toEqual({ ok: false, error: 'access' });
  expect(adapter.respond('pucara', 'veterinarian', 'pucara-temperature', 'acknowledged', 'Checked in field', demoNow)).toEqual({ ok: false, error: 'access' });
  expect(adapter.record('esperanza', 'rancher', careInput(), demoNow)).toEqual({ ok: false, error: 'access' });
  expect(adapter.record('esperanza', 'veterinarian', careInput({ kind: 'observation' }), demoNow)).toEqual({ ok: false, error: 'access' });
  expect(adapter.record('esperanza', 'rancher', careInput({ animalId: 'ICH-089', kind: 'observation' }), demoNow)).toEqual({ ok: true });
  expect(adapter.record('esperanza', 'veterinarian', careInput({ animalId: 'ICH-089' }), demoNow)).toEqual({ ok: true });
});

test('alert responses require a valid note and follow open-to-acknowledged-to-resolved transitions', () => {
  const adapter = new MockOperationsAdapter();
  const alertId = 'esperanza-temperature';

  expect(adapter.respond('esperanza', 'rancher', alertId, 'resolved', 'Resolve directly', demoNow)).toEqual({ ok: false, error: 'transition' });
  expect(adapter.respond('esperanza', 'rancher', alertId, 'acknowledged', '   ', demoNow)).toEqual({ ok: false, error: 'required' });
  expect(adapter.respond('esperanza', 'rancher', alertId, 'acknowledged', 'Checked the animal', demoNow)).toEqual({ ok: true });
  expect(adapter.read('esperanza', 'rancher').alerts.find((alert) => alert.id === alertId)?.status).toBe('acknowledged');
  expect(adapter.respond('esperanza', 'rancher', alertId, 'acknowledged', 'Duplicate response', demoNow)).toEqual({ ok: false, error: 'transition' });
  expect(adapter.respond('esperanza', 'rancher', alertId, 'resolved', 'Follow-up recorded', demoNow)).toEqual({ ok: true });
  expect(adapter.read('esperanza', 'rancher').alerts.find((alert) => alert.id === alertId)?.status).toBe('resolved');
});

test('care records validate animal, note, event date, product details and withdrawal range', () => {
  const adapter = new MockOperationsAdapter();

  expect(adapter.record('esperanza', 'veterinarian', careInput({ animalId: 'ICH-999' }), demoNow)).toEqual({ ok: false, error: 'animal' });
  expect(adapter.record('esperanza', 'veterinarian', careInput({ note: '  ' }), demoNow)).toEqual({ ok: false, error: 'required' });
  expect(adapter.record('esperanza', 'veterinarian', careInput({ occurredAt: '2026-02-30' }), demoNow)).toEqual({ ok: false, error: 'date' });
  expect(adapter.record('esperanza', 'veterinarian', careInput({ product: '' }), demoNow)).toEqual({ ok: false, error: 'required' });
  expect(adapter.record('esperanza', 'veterinarian', careInput({ withdrawalStart: '2026-10-07' }), demoNow)).toEqual({ ok: false, error: 'withdrawal' });
});

test('overlapping withdrawal for the same animal and product requires explicit review', () => {
  const adapter = new MockOperationsAdapter();
  const input = careInput({ product: ' demo-p01 ', withdrawalEnd: '2026-10-15' });

  expect(adapter.record('esperanza', 'veterinarian', input, demoNow)).toEqual({ ok: false, error: 'withdrawal-review' });
  expect(adapter.record('esperanza', 'veterinarian', { ...input, withdrawalReviewed: true }, demoNow)).toEqual({ ok: true });
  expect(adapter.read('esperanza', 'veterinarian').records.at(-1)?.product).toBe('demo-p01');
});
