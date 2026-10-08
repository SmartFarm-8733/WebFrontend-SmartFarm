export type PlanId = 'basic' | 'ganadero' | 'establishment';
export type PlanAudience = 'rancher' | 'veterinarian';
export type DeviceLimit =
  | { readonly kind: 'unspecified' }
  | { readonly kind: 'maximum'; readonly count: number };

export type PlanCoverageCode =
  | 'herd-and-lots'
  | 'health-calendar'
  | 'single-user'
  | 'gps-geofences'
  | 'anti-theft'
  | 'nutrition-fattening'
  | 'sms-push-alerts'
  | 'five-users-plus-vet'
  | 'advanced-reports'
  | 'multi-farm'
  | 'multi-lot'
  | 'priority-support'
  | 'ichu-collar'
  | 'offline-telemetry'
  | 'mobile-app';

export interface SubscriptionPlan {
  readonly id: PlanId;
  readonly annualRatePerHead: number;
  readonly headLimit: number | null;
  readonly deviceLimit: DeviceLimit;
  readonly coverage: readonly PlanCoverageCode[];
}

export interface AnnualPlanEstimate {
  readonly planId: PlanId;
  readonly headCount: number;
  readonly annualAmount: number;
  readonly withinHeadLimit: boolean;
  readonly suggestedPlanId: PlanId | null;
}

export interface DemoSubscription {
  readonly herdId: string;
  readonly planId: PlanId;
  readonly headCount: number;
  readonly audience: PlanAudience;
  readonly activatedAt: string;
  readonly mode: 'simulated';
}

export type DemoActivationResult =
  | { readonly kind: 'activated'; readonly subscription: DemoSubscription }
  | { readonly kind: 'invalid-plan' }
  | { readonly kind: 'invalid-head-count' }
  | { readonly kind: 'capacity-exceeded'; readonly suggestedPlanId: PlanId | null };

const sharedCoverage: readonly PlanCoverageCode[] = [
  'ichu-collar', 'offline-telemetry', 'mobile-app',
];

// These per-head rates are provisional values shown in the supplied subscription mockup.
export const SUBSCRIPTION_PLANS: readonly SubscriptionPlan[] = [
  {
    id: 'basic', annualRatePerHead: 18, headLimit: 50,
    deviceLimit: { kind: 'unspecified' },
    coverage: [...sharedCoverage, 'herd-and-lots', 'health-calendar', 'single-user'],
  },
  {
    id: 'ganadero', annualRatePerHead: 24, headLimit: 300,
    deviceLimit: { kind: 'unspecified' },
    coverage: [...sharedCoverage, 'herd-and-lots', 'health-calendar', 'gps-geofences',
      'anti-theft', 'nutrition-fattening', 'sms-push-alerts', 'five-users-plus-vet'],
  },
  {
    id: 'establishment', annualRatePerHead: 30, headLimit: null,
    deviceLimit: { kind: 'unspecified' },
    coverage: [...sharedCoverage, 'advanced-reports', 'multi-farm', 'multi-lot', 'priority-support'],
  },
];

export function planCoversHeads(plan: SubscriptionPlan, headCount: number): boolean {
  return Number.isSafeInteger(headCount) && headCount > 0
    && (plan.headLimit === null || headCount <= plan.headLimit);
}

export function planFor(id: PlanId): SubscriptionPlan | undefined {
  return SUBSCRIPTION_PLANS.find(plan => plan.id === id);
}

export function isPlanId(value: string | null): value is PlanId {
  return value === 'basic' || value === 'ganadero' || value === 'establishment';
}

export function estimateAnnualPlan(plan: SubscriptionPlan, headCount: number): AnnualPlanEstimate | null {
  if (!Number.isSafeInteger(headCount) || headCount < 1) return null;
  const suggested = SUBSCRIPTION_PLANS.find(candidate => planCoversHeads(candidate, headCount));
  return {
    planId: plan.id,
    headCount,
    annualAmount: Math.round(plan.annualRatePerHead * headCount * 100) / 100,
    withinHeadLimit: planCoversHeads(plan, headCount),
    suggestedPlanId: suggested?.id ?? null,
  };
}
