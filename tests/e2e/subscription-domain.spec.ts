import { expect, test } from '@playwright/test';
import {
  estimateAnnualPlan,
  isPlanId,
  planCoversHeads,
  planFor,
  SUBSCRIPTION_PLANS,
} from '../../src/app/features/subscription-plans/domain/subscription.model';

test.describe('subscription domain rules', () => {
  test('keeps provisional annual rates and unspecified device limits explicit', () => {
    expect(SUBSCRIPTION_PLANS.map(({ id, annualRatePerHead }) => [id, annualRatePerHead]))
      .toEqual([
        ['basic', 18],
        ['ganadero', 24],
        ['establishment', 30],
      ]);
    expect(SUBSCRIPTION_PLANS.every(plan => plan.deviceLimit.kind === 'unspecified')).toBe(true);
  });

  test('accepts inclusive head limits and suggests the next plan above each cap', () => {
    const basic = planFor('basic');
    const ganadero = planFor('ganadero');
    const establishment = planFor('establishment');

    expect(basic).toBeDefined();
    expect(ganadero).toBeDefined();
    expect(establishment).toBeDefined();
    if (!basic || !ganadero || !establishment) return;

    expect(planCoversHeads(basic, 50)).toBe(true);
    expect(planCoversHeads(basic, 51)).toBe(false);
    expect(planCoversHeads(ganadero, 300)).toBe(true);
    expect(planCoversHeads(ganadero, 301)).toBe(false);
    expect(planCoversHeads(establishment, Number.MAX_SAFE_INTEGER)).toBe(true);

    expect(estimateAnnualPlan(basic, 51)).toMatchObject({
      annualAmount: 918,
      withinHeadLimit: false,
      suggestedPlanId: 'ganadero',
    });
    expect(estimateAnnualPlan(ganadero, 301)).toMatchObject({
      annualAmount: 7224,
      withinHeadLimit: false,
      suggestedPlanId: 'establishment',
    });
  });

  test('rejects invalid head counts for coverage and annual estimates', () => {
    const basic = planFor('basic');
    expect(basic).toBeDefined();
    if (!basic) return;

    for (const count of [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, Number.MAX_SAFE_INTEGER + 1]) {
      expect(planCoversHeads(basic, count), `coverage for ${count}`).toBe(false);
      expect(estimateAnnualPlan(basic, count), `estimate for ${count}`).toBeNull();
    }
  });

  test('recognizes only catalog plan identifiers', () => {
    expect(isPlanId('basic')).toBe(true);
    expect(isPlanId('ganadero')).toBe(true);
    expect(isPlanId('establishment')).toBe(true);
    expect(isPlanId('free')).toBe(false);
    expect(isPlanId(null)).toBe(false);
  });
});
