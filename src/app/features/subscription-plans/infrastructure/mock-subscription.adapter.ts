import { Injectable } from '@angular/core';
import {
  planCoversHeads, planFor, SUBSCRIPTION_PLANS,
} from '../domain/subscription.model';
import { PlanCatalogPort, SubscriptionRepositoryPort } from '../domain/subscription.ports';
import type {
  DemoActivationResult, DemoSubscription, PlanAudience, PlanId, SubscriptionPlan,
} from '../domain/subscription.model';

@Injectable({ providedIn: 'root' })
export class MockSubscriptionAdapter extends SubscriptionRepositoryPort implements PlanCatalogPort {
  private readonly subscriptions = new Map<string, DemoSubscription>();

  listPlans(): readonly SubscriptionPlan[] {
    return SUBSCRIPTION_PLANS;
  }

  override latestFor(herdId: string): DemoSubscription | null {
    const subscription = this.subscriptions.get(herdId);
    return subscription ? { ...subscription } : null;
  }

  override simulateActivation(
    herdId: string, planId: PlanId, headCount: number, audience: PlanAudience, activatedAt: string,
  ): DemoActivationResult {
    const plan = planFor(planId);
    if (!plan) return { kind: 'invalid-plan' };
    if (!Number.isSafeInteger(headCount) || headCount < 1) return { kind: 'invalid-head-count' };
    if (!planCoversHeads(plan, headCount)) {
      const suggestedPlanId = SUBSCRIPTION_PLANS.find(candidate => planCoversHeads(candidate, headCount))?.id ?? null;
      return { kind: 'capacity-exceeded', suggestedPlanId };
    }

    const subscription: DemoSubscription = {
      herdId, planId, headCount, audience, activatedAt, mode: 'simulated',
    };
    this.subscriptions.set(herdId, subscription);
    return { kind: 'activated', subscription: { ...subscription } };
  }
}
