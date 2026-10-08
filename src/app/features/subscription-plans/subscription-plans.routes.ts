import { type Provider } from '@angular/core';
import { type Routes } from '@angular/router';
import { SubscriptionFacade } from './application/subscription.facade';
import { PlanCatalogPort, SubscriptionRepositoryPort } from './domain/subscription.ports';
import { MockSubscriptionAdapter } from './infrastructure/mock-subscription.adapter';
import { CheckoutPage } from './presentation/checkout-page';
import { SubscriptionPage } from './presentation/subscription-page';

const subscriptionProviders: Provider[] = [
  SubscriptionFacade,
  { provide: PlanCatalogPort, useExisting: MockSubscriptionAdapter },
  { provide: SubscriptionRepositoryPort, useExisting: MockSubscriptionAdapter },
];

export const SUBSCRIPTION_PLANS_ROUTES: Routes = [
  { path: 'plans', component: SubscriptionPage, providers: subscriptionProviders },
  { path: 'checkout', component: CheckoutPage, providers: subscriptionProviders },
];
