import { expect, type Page, test } from '@playwright/test';

const legacyLabels = /\b(?:demo|tb1|demonstration|demostraci[oó]n|prototype|prototipo)\b/i;

async function expectWorkspaceCopy(page: Page): Promise<void> {
  await expect(page.locator('body')).not.toContainText(legacyLabels);
  const accessibleLabels = await page.locator('[aria-label], [title], img[alt]').evaluateAll(elements =>
    elements.flatMap(element => ['aria-label', 'title', 'alt'].map(name => element.getAttribute(name) ?? '')).join('\n'),
  );
  expect(accessibleLabels).not.toMatch(legacyLabels);
}

for (const locale of ['en_US', 'es_419']) {
  test(`public account copy stays consistent in ${locale}`, async ({ page }) => {
    await page.addInitScript(value => localStorage.setItem('ichu.locale', value), locale);
    for (const path of ['/login', '/register', '/recover', '/terms']) {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await page.locator('details').evaluateAll(elements => elements.forEach(element => {
        if (element instanceof HTMLDetailsElement) element.open = true;
      }));
      await expectWorkspaceCopy(page);
    }
  });

  test(`herd pages and plan feedback stay consistent in ${locale}`, async ({ page }) => {
    await page.addInitScript(value => localStorage.setItem('ichu.locale', value), locale);
    await page.goto('/login');
    await page.getByRole('button', { name: locale === 'en_US' ? 'Open workspace' : 'Abrir espacio de trabajo', exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    for (const path of ['dashboard', 'cattle', 'locations', 'monitoring', 'alerts', 'health', 'planning',
      'nutrition', 'reproduction', 'reports', 'devices', 'advisories', 'plans', 'account']) {
      await page.locator(`.sidebar nav a[href="/${path}"]`).click();
      await expect(page.locator('main h1')).toBeVisible();
      await expectWorkspaceCopy(page);
      if (path === 'cattle') {
        await page.locator('.inventory tbody a').first().click();
        await expect(page.locator('main h1')).toBeVisible();
        await expectWorkspaceCopy(page);
      }
    }
    await page.locator('#herd').selectOption('pucara');
    await page.locator('.sidebar nav a[href="/planning"]').click();
    await expect(page.locator('main h1')).toBeVisible();
    await expectWorkspaceCopy(page);
    await page.locator('.sidebar nav a[href="/plans"]').click();
    await page.locator('#plan-head-count').fill('9');
    await page.locator('.plan-card').first().getByRole('button').click();
    await expect(page.locator('main h1')).toBeVisible();
    await page.locator('#checkout-terms').check();
    await page.getByRole('button', { name: locale === 'en_US' ? 'Save selection' : 'Guardar selección', exact: true }).click();
    await expect(page.locator('.activation-result')).toBeVisible();
    await expectWorkspaceCopy(page);
    await expect(page.locator('.activation-result')).toContainText(
      locale === 'en_US' ? 'No payment was processed' : 'No se procesó ningún pago',
    );
  });
}
