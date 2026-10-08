import { expect, Page, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function enter(page: Page, role = 'rancher'): Promise<void> {
  await page.goto('/login');
  await page.locator('#login-role').selectOption(role);
  await page.getByRole('button', { name: 'Explore demo', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

async function navigate(page: Page, path: string): Promise<void> {
  await page.locator(`.sidebar nav a[href="/${path}"]`).click();
  await expect(page).toHaveURL(new RegExp(`/${path}$`));
  await expect(page.locator('main h1')).toHaveCount(1);
}

test('every context renders without errors and passes accessibility checks', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await enter(page);
  for (const path of ['dashboard', 'cattle', 'locations', 'monitoring', 'alerts', 'health', 'planning',
    'nutrition', 'reproduction', 'reports', 'devices', 'advisories', 'plans', 'account']) {
    await navigate(page, path);
    await expect(page.locator('img:visible')).not.toHaveCount(0);
    const findings = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    await testInfo.attach(`${path}-accessibility`, { body: JSON.stringify(findings.violations), contentType: 'application/json' });
    expect.soft(findings.violations, path).toEqual([]);
  }
  expect(errors).toEqual([]);
});

test('herd and language changes preserve the selected workspace', async ({ page }) => {
  await enter(page);
  await page.locator('#herd').selectOption('pucara');
  await expect(page.locator('main')).toContainText('Luna');
  await expect(page.locator('main')).not.toContainText('Lucero');
  await page.locator('#locale').selectOption('es_419');
  await expect(page.locator('html')).toHaveAttribute('lang', 'es-419');
  await navigate(page, 'cattle');
  await expect(page.locator('main h1')).toHaveText('Mi hato');
  await expect(page.locator('#herd')).toHaveValue('pucara');
  await page.locator('#workspace-role').selectOption('veterinarian');
  await expect(page.locator('#herd option')).toHaveCount(1);
  await expect(page.locator('#herd')).toHaveValue('esperanza');
  await expect(page.getByRole('button', { name: 'Registrar animal', exact: true })).toHaveCount(0);
});

test('animal registration validates duplicate tags and survives navigation', async ({ page }) => {
  await enter(page);
  await navigate(page, 'cattle');
  await page.getByRole('button', { name: 'Register animal', exact: true }).click();
  await page.locator('#animal-tag').fill('ICH-118');
  await page.locator('#animal-name').fill('Demo calf');
  await page.locator('#animal-birth').fill('2026-09-01');
  await page.getByRole('button', { name: 'Save animal', exact: true }).click();
  await expect(page.locator('.registration [role="alert"]')).toBeVisible();
  await page.locator('#animal-tag').fill('ICH-990');
  await page.getByRole('button', { name: 'Save animal', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Open record', exact: true })).toBeVisible();
  await navigate(page, 'dashboard');
  await expect(page.locator('.stat').first()).toContainText('10');
  await navigate(page, 'cattle');
  await page.locator('#cattle-search').fill('ICH-990');
  await expect(page.locator('.inventory tbody')).toContainText('Demo calf');
});

test('responding to an alert updates the overview', async ({ page }) => {
  await enter(page);
  await navigate(page, 'alerts');
  await page.getByRole('button', { name: 'Record response', exact: true }).first().click();
  await page.locator('#alert-response-note').fill('Checked animal in the demonstration.');
  await page.getByRole('button', { name: 'Acknowledge alert', exact: true }).click();
  await page.locator('.alert-entry').first().getByRole('button', { name: 'Resolve alert', exact: true }).click();
  await page.locator('#alert-response-note').fill('Follow-up completed in this demo.');
  await page.locator('#alert-response-form').getByRole('button', { name: 'Resolve alert', exact: true }).click();
  await navigate(page, 'dashboard');
  await expect(page.locator('.stat').nth(2).locator('.stat-value')).toHaveText('2');
});

test('mobile screens fit the viewport and the drawer is usable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await enter(page);
  for (const path of ['cattle', 'monitoring', 'planning', 'devices', 'plans', 'account']) {
    await page.getByRole('button', { name: 'Toggle navigation', exact: true }).click();
    await navigate(page, path);
    await expect(page.locator('.sidebar')).not.toHaveClass(/open/);
    const widths = await page.evaluate(() => ({ content: document.documentElement.scrollWidth, viewport: innerWidth }));
    expect.soft(widths.content, path).toBeLessThanOrEqual(widths.viewport + 1);
  }
});

test('leaving the demo does not persist credentials or a session', async ({ page }) => {
  await enter(page);
  await page.getByRole('button', { name: 'Leave demo', exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto('/devices');
  await expect(page).toHaveURL(/\/login$/);
  const stored = await page.evaluate(() => ({ ...localStorage }));
  expect(Object.keys(stored).filter(key => key !== 'ichu.locale')).toEqual([]);
});
