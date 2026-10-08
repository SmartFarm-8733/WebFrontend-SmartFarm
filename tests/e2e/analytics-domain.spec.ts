import { expect, test } from '@playwright/test';
import { csvCell, deriveMetrics, HerdOverview } from '../../src/app/features/dashboard-analytics/domain/analytics';

test('CSV export quotes values and neutralizes formula prefixes', () => {
  expect(csvCell('A,"B"')).toBe('"A,""B"""');
  expect(csvCell('ICH-118')).toBe('"ICH-118"');
  expect(csvCell(12)).toBe('"12"');
  for (const value of ['=1+1', '+1', '-1', '@SUM(A1)', '  =1', '\tformula', '\rformula', '\nformula']) {
    expect(csvCell(value)).toBe('"\'' + value + '"');
  }
});

test('overview metrics are derived from active and unresolved source records', () => {
  const snapshot: HerdOverview = {
    animals: [
      { id: 'a', tag: 'ICH-118', name: 'Lucero', stage: 'dairy', lot: 'lot-03', active: true, collar: 'connected' },
      { id: 'b', tag: 'ICH-132', name: 'Brisa', stage: 'dry', lot: 'lot-03', active: true, collar: 'disconnected' },
      { id: 'c', tag: 'ICH-156', name: 'Centella', stage: 'fattening', lot: 'lot-05', active: false, collar: 'none' },
    ],
    alerts: [
      { id: 'a', tag: 'ICH-118', priority: 'high', status: 'open', title: { en: 'Sample', es: 'Muestra' }, at: '2026-10-08' },
      { id: 'b', tag: 'ICH-132', priority: 'high', status: 'resolved', title: { en: 'Sample', es: 'Muestra' }, at: '2026-10-08' },
    ],
    campaigns: [{ id: 'c', name: { en: 'Sample', es: 'Muestra' }, date: '2026-10-08', progress: 100, status: 'completed' }],
    connectedDevices: 1, deviceCount: 2, capturedAt: '2026-10-08T10:30:00-05:00',
  };
  expect(deriveMetrics(snapshot)).toEqual({
    activeAnimals: 2, connectedCollars: 1, openAlerts: 1, highPriority: 1,
    inactiveAnimals: 1, completedCampaigns: 1, plannedCampaigns: 1,
  });
});
