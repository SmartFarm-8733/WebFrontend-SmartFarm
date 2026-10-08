import { computed, inject, Injectable, signal } from '@angular/core';
import { WorkspaceService } from '../../../core/config/workspace.service';
import { estimateAnnualPlan, planFor } from '../domain/subscription.model';
import { PlanCatalogPort, SubscriptionRepositoryPort } from '../domain/subscription.ports';
import type {
  AnnualPlanEstimate, DemoActivationResult, DemoSubscription, PlanId, SubscriptionPlan,
} from '../domain/subscription.model';

@Injectable()
export class SubscriptionFacade {
  private readonly catalog = inject(PlanCatalogPort);
  private readonly repository = inject(SubscriptionRepositoryPort);
  private readonly workspace = inject(WorkspaceService);
  private readonly refresh = signal(0);

  readonly plans = computed(() => this.catalog.listPlans());
  readonly preferredPlanId = computed<PlanId>(() =>
    this.workspace.role() === 'veterinarian' ? 'establishment' : 'ganadero');
  readonly latestDemoActivation = computed<DemoSubscription | null>(() => {
    this.refresh();
    return this.repository.latestFor(this.workspace.herdId());
  });

  plan(id: PlanId): SubscriptionPlan | undefined {
    return this.plans().find(plan => plan.id === id) ?? planFor(id);
  }

  estimate(id: PlanId, headCount: number): AnnualPlanEstimate | null {
    const plan = this.plan(id);
    return plan ? estimateAnnualPlan(plan, headCount) : null;
  }

  simulateActivation(id: PlanId, headCount: number): DemoActivationResult {
    const plan = this.plan(id);
    if (!plan) return { kind: 'invalid-plan' };
    const estimate = estimateAnnualPlan(plan, headCount);
    if (!estimate) return { kind: 'invalid-head-count' };
    if (!estimate.withinHeadLimit) {
      return { kind: 'capacity-exceeded', suggestedPlanId: estimate.suggestedPlanId };
    }

    const result = this.repository.simulateActivation(
      this.workspace.herdId(), id, headCount, this.workspace.role(), this.workspace.now,
    );
    if (result.kind === 'activated') this.refresh.update(value => value + 1);
    return result;
  }
}
