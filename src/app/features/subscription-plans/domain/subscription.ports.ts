import type {
  DemoActivationResult, DemoSubscription, PlanAudience, PlanId, SubscriptionPlan,
} from './subscription.model';

export abstract class PlanCatalogPort {
  abstract listPlans(): readonly SubscriptionPlan[];
}

export abstract class SubscriptionRepositoryPort {
  abstract latestFor(herdId: string): DemoSubscription | null;
  abstract simulateActivation(
    herdId: string, planId: PlanId, headCount: number, audience: PlanAudience, activatedAt: string,
  ): DemoActivationResult;
}
