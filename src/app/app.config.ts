import { ApplicationConfig, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';

import { routes } from './app.routes';
import { CattleRepository } from './features/cattle-information/domain/cattle.repository';
import { CattleMockRepository } from './features/cattle-information/infrastructure/cattle.mock.repository';
import { OverviewSource } from './features/dashboard-analytics/domain/analytics';
import { DeviceRepository } from './features/iot-assets/domain/device.repository';
import { MockDeviceAdapter } from './features/iot-assets/infrastructure/mock-device.adapter';
import { OperationsRepository } from './features/operations-monitoring/domain/operations.repository';
import { MockOperationsAdapter } from './features/operations-monitoring/infrastructure/mock-operations.adapter';
import { PlanningRepository } from './features/planning/domain/planning.repository';
import { MockPlanningAdapter } from './features/planning/infrastructure/mock-planning.adapter';
import { ComposedOverviewSource } from './core/config/overview-source';
import { SubscriptionFacade } from './features/subscription-plans/application/subscription.facade';
import { PlanCatalogPort, SubscriptionRepositoryPort } from './features/subscription-plans/domain/subscription.ports';
import { MockSubscriptionAdapter } from './features/subscription-plans/infrastructure/mock-subscription.adapter';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideRouter(routes, withInMemoryScrolling({
      scrollPositionRestoration: 'enabled', anchorScrolling: 'enabled',
    })),
    { provide: CattleRepository, useExisting: CattleMockRepository },
    { provide: DeviceRepository, useExisting: MockDeviceAdapter },
    { provide: OperationsRepository, useExisting: MockOperationsAdapter },
    { provide: PlanningRepository, useExisting: MockPlanningAdapter },
    { provide: OverviewSource, useExisting: ComposedOverviewSource },
    SubscriptionFacade,
    { provide: PlanCatalogPort, useExisting: MockSubscriptionAdapter },
    { provide: SubscriptionRepositoryPort, useExisting: MockSubscriptionAdapter },
  ],
};
