import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('public account screens are accessible and recovery sends no email', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  for (const path of ['/login', '/register', '/recover', '/terms']) {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    const findings = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect.soft(findings.violations.map(item => ({ id: item.id, nodes: item.nodes.map(node => node.target) })), path).toEqual([]);
  }
  await page.goto('/recover');
  await page.locator('#recovery-email').fill('demo@example.com');
  await page.getByRole('button', { name: 'Show recovery guidance', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Send reset email', exact: true })).toBeDisabled();
  expect(errors).toEqual([]);
});

test('registration leads to a demo checkout with no sensitive payment fields', async ({ page }) => {
  await page.goto('/register');
  await page.locator('#register-name').fill('Demo Rancher');
  await page.locator('#register-email').fill('demo@example.com');
  await page.locator('#register-region').selectOption('Junín');
  await page.locator('#register-terms').check();
  await page.getByRole('button', { name: 'Review profile', exact: true }).click();
  await page.getByRole('button', { name: 'Confirm and explore plans', exact: true }).click();
  await expect(page).toHaveURL(/\/plans$/);
  await page.locator('#plan-head-count').fill('9');
  await page.locator('.plan-card').first().getByRole('button').click();
  await expect(page).toHaveURL(/\/checkout\?/);
  await expect(page.locator('input')).toHaveCount(2);
  await page.locator('#checkout-terms').check();
  await page.getByRole('button', { name: 'Simulate demo activation', exact: true }).click();
  await expect(page.locator('.activation-result')).toContainText(/demo|simulat/i);
  const findings = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(findings.violations.map(item => ({ id: item.id, nodes: item.nodes.map(node => node.target) }))).toEqual([]);
});
