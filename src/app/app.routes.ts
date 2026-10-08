import { Routes } from '@angular/router';
import { demoAccessGuard } from './core/config/demo-access.guard';

export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./features/identity-access-management/presentation/auth-pages').then(module => module.LoginPage) },
  { path: 'register', loadComponent: () => import('./features/identity-access-management/presentation/auth-pages').then(module => module.RegisterPage) },
  { path: 'recover', loadComponent: () => import('./features/identity-access-management/presentation/auth-pages').then(module => module.RecoveryPage) },
  { path: 'terms', loadComponent: () => import('./core/layout/terms-page').then(module => module.TermsPage) },
  {
    path: '', canActivate: [demoAccessGuard],
    loadComponent: () => import('./core/layout/shell').then(module => module.Shell),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: 'dashboard', loadComponent: () => import('./features/dashboard-analytics/presentation/dashboard.page').then(module => module.DashboardPage) },
      { path: 'cattle/:id', loadComponent: () => import('./features/cattle-information/presentation/cattle-detail.page').then(module => module.CattleDetailPage) },
      { path: 'cattle', loadComponent: () => import('./features/cattle-information/presentation/cattle.page').then(module => module.CattlePage) },
      { path: 'monitoring', data: { view: 'monitoring' }, loadComponent: () => import('./features/operations-monitoring/presentation/monitoring.page').then(module => module.MonitoringPage) },
      { path: 'locations', data: { view: 'locations' }, loadComponent: () => import('./features/operations-monitoring/presentation/monitoring.page').then(module => module.MonitoringPage) },
      { path: 'nutrition', data: { view: 'nutrition' }, loadComponent: () => import('./features/operations-monitoring/presentation/monitoring.page').then(module => module.MonitoringPage) },
      { path: 'alerts', loadComponent: () => import('./features/operations-monitoring/presentation/alerts.page').then(module => module.AlertsPage) },
      { path: 'health', loadComponent: () => import('./features/operations-monitoring/presentation/health.page').then(module => module.HealthPage) },
      { path: 'reproduction', loadComponent: () => import('./features/operations-monitoring/presentation/reproduction.page').then(module => module.ReproductionPage) },
      { path: 'planning', loadComponent: () => import('./features/planning/presentation/planning.page').then(module => module.PlanningPage) },
      { path: 'reports', loadComponent: () => import('./features/dashboard-analytics/presentation/reports.page').then(module => module.ReportsPage) },
      { path: 'devices', loadComponent: () => import('./features/iot-assets/presentation/devices.page').then(module => module.DevicesPage) },
      { path: 'advisories', loadComponent: () => import('./features/identity-access-management/presentation/advisories-page').then(module => module.AdvisoriesPage) },
      { path: 'account', loadComponent: () => import('./features/identity-access-management/presentation/account-page').then(module => module.AccountPage) },
      { path: 'plans', loadComponent: () => import('./features/subscription-plans/presentation/subscription-page').then(module => module.SubscriptionPage) },
      { path: 'checkout', loadComponent: () => import('./features/subscription-plans/presentation/checkout-page').then(module => module.CheckoutPage) },
    ],
  },
  { path: '**', loadComponent: () => import('./shared/presentation/not-found.page').then(module => module.NotFoundPage) },
];
