import { expect, test } from '@playwright/test';
import {
  dateValue,
  registerCampaignApplication,
  shiftDate,
  validateCampaign,
  withdrawalOverlaps,
  type HealthCampaign,
  type PlanningAnimal,
  type PlanningLot,
  type ScheduleCampaign,
  type WithdrawalPeriod,
} from '../../src/app/features/planning/domain/planning.models';

const esperanzaAnimals: readonly PlanningAnimal[] = [
  { id: 'esperanza-ICH118', tag: 'ICH118', active: true },
  { id: 'esperanza-ICH104', tag: 'ICH104', active: true },
  { id: 'esperanza-ICH132', tag: 'ICH132', active: true },
  { id: 'esperanza-ICH134', tag: 'ICH134', active: true },
  { id: 'esperanza-ICH089', tag: 'ICH089', active: true },
];
const lot03: PlanningLot = {
  id: 'esperanza-lot-03',
  name: { en: 'Lot 03', es: 'Lote 03' },
  animals: esperanzaAnimals,
};
const inactiveLot: PlanningLot = {
  id: 'esperanza-lot-05',
  name: { en: 'Lot 05', es: 'Lote 05' },
  animals: [{ id: 'esperanza-ICH156', tag: 'ICH156', active: false }],
};
const validSchedule: ScheduleCampaign = {
  name: 'Vaccination',
  lotId: lot03.id,
  date: '2026-10-08',
  type: 'vaccination',
  animalCount: esperanzaAnimals.length,
  leadDays: 3,
};
const campaign: HealthCampaign = {
  id: 'esperanza-vaccination',
  herdId: 'esperanza',
  name: { en: 'Vaccination', es: 'Vacunación' },
  type: 'vaccination',
  lotId: lot03.id,
  date: '2026-10-08',
  animalIds: esperanzaAnimals.slice(0, 2).map(animal => animal.id),
  applications: [],
  status: 'scheduled',
  reminder: { leadDays: 3 },
};

test('rejects malformed date-only values and invalid date shifts', () => {
  for (const value of ['2026-02-30', '2026-2-03', 'not-a-date', '2026-10-08T00:00:00Z']) {
    expect(Number.isNaN(dateValue(value))).toBe(true);
  }
  expect(() => shiftDate('2026-02-30', 1)).toThrow(RangeError);
  expect(() => shiftDate('2026-10-08', 1.5)).toThrow(RangeError);
});

test('parses and shifts leap dates without losing the calendar day', () => {
  expect(Number.isFinite(dateValue('2024-02-29'))).toBe(true);
  expect(Number.isNaN(dateValue('2025-02-29'))).toBe(true);
  expect(shiftDate('2024-02-29', 1)).toBe('2024-03-01');
  expect(shiftDate('2024-03-01', -1)).toBe('2024-02-29');
});

test('validates campaign details against active identified animals', () => {
  const lots = [lot03, inactiveLot];
  expect(validateCampaign(validSchedule, lots, '2026-10-08')).toBeUndefined();
  expect(validateCampaign({ ...validSchedule, name: '   ' }, lots, '2026-10-08')).toBe('name');
  expect(validateCampaign({ ...validSchedule, name: 'x'.repeat(81) }, lots, '2026-10-08')).toBe('name');
  expect(validateCampaign({ ...validSchedule, lotId: 'missing-lot' }, lots, '2026-10-08')).toBe('lot');
  expect(validateCampaign({ ...validSchedule, date: '2026-02-30' }, lots, '2026-10-08')).toBe('date');
  expect(validateCampaign({ ...validSchedule, date: '2026-10-07' }, lots, '2026-10-08')).toBe('date');
  expect(validateCampaign({ ...validSchedule, animalCount: esperanzaAnimals.length + 1 }, lots, '2026-10-08')).toBe('animals');
  expect(validateCampaign({ ...validSchedule, animalCount: 1.5 }, lots, '2026-10-08')).toBe('animals');
  expect(validateCampaign({ ...validSchedule, lotId: inactiveLot.id, animalCount: 1 }, lots, '2026-10-08')).toBe('animals');
  expect(validateCampaign({ ...validSchedule, leadDays: 31 }, lots, '2026-10-08')).toBe('reminder');
});

test('rejects malformed application timestamps', () => {
  for (const at of ['', '2026-02-30T08:00:00Z', '2026-10-08T25:00:00Z', '2026-10-08T08:00:00']) {
    expect(registerCampaignApplication(campaign, esperanzaAnimals[0].id, at)).toBe('timestamp');
  }
});

test('does not register a second application for the same animal', () => {
  const alreadyApplied: HealthCampaign = {
    ...campaign,
    applications: [{ animalId: esperanzaAnimals[0].id, at: '2026-10-08T08:00:00-05:00' }],
    status: 'in-progress',
  };
  expect(registerCampaignApplication(alreadyApplied, esperanzaAnimals[0].id, '2026-10-08T09:00:00-05:00')).toBe('duplicate');
});

test('closes a campaign when its final application is recorded', () => {
  const firstAnimalId = campaign.animalIds[0];
  const finalAnimalId = campaign.animalIds[1];
  if (!firstAnimalId || !finalAnimalId) throw new Error('Expected two campaign animals');
  const almostComplete: HealthCampaign = {
    ...campaign,
    applications: [{ animalId: firstAnimalId, at: '2026-10-08T08:00:00-05:00' }],
    status: 'in-progress',
  };
  const at = '2026-10-08T09:15:00-05:00';
  const updated = registerCampaignApplication(almostComplete, finalAnimalId, at);
  if (typeof updated === 'string') throw new Error(`Expected campaign update, received ${updated}`);
  expect(updated.applications).toHaveLength(campaign.animalIds.length);
  expect(updated.applications[1]).toEqual({ animalId: finalAnimalId, at });
  expect(updated.status).toBe('completed');
  expect(updated.closedAt).toBe(at);
});

test('limits withdrawal overlaps to the selected herd, animal and date range', () => {
  const luceroWithdrawal: WithdrawalPeriod = {
    herdId: 'esperanza',
    animalId: 'esperanza-ICH118',
    start: '2026-10-06',
    end: '2026-10-12',
    product: { en: 'Treatment not specified', es: 'Tratamiento no especificado' },
    destination: 'unknown',
    source: 'demo-clinical-record',
  };
  const periods: WithdrawalPeriod[] = [
    luceroWithdrawal,
    { ...luceroWithdrawal, herdId: 'pucara', animalId: 'pucara-ICH118' },
    { ...luceroWithdrawal, source: 'unknown' },
  ];

  expect(withdrawalOverlaps('esperanza', ['esperanza-ICH118', 'pucara-ICH118'], '2026-10-06', periods)).toEqual([luceroWithdrawal]);
  expect(withdrawalOverlaps('esperanza', ['esperanza-ICH118'], '2026-10-12', periods)).toEqual([luceroWithdrawal]);
  expect(withdrawalOverlaps('esperanza', ['esperanza-ICH118'], '2026-10-13', periods)).toEqual([]);
  expect(withdrawalOverlaps('pucara', ['pucara-ICH118'], '2026-10-08', periods)).toEqual([]);
});
