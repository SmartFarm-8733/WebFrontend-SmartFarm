import { Routes } from '@angular/router';
import { AlertsPage } from './presentation/alerts.page';
import { HealthPage } from './presentation/health.page';
import { MonitoringPage } from './presentation/monitoring.page';
import { ReproductionPage } from './presentation/reproduction.page';

export const OPERATIONS_MONITORING_ROUTES: Routes = [
  { path: 'monitoring', component: MonitoringPage, data: { view: 'monitoring' } },
  { path: 'locations', component: MonitoringPage, data: { view: 'locations' } },
  { path: 'nutrition', component: MonitoringPage, data: { view: 'nutrition' } },
  { path: 'alerts', component: AlertsPage },
  { path: 'health', component: HealthPage },
  { path: 'reproduction', component: ReproductionPage },
];
