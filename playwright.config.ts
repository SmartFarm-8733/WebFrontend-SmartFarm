import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  retries: process.env['CI'] ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:4180',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{
    name: 'chromium',
    use: { ...devices['Desktop Chrome'], channel: process.env['PLAYWRIGHT_CHANNEL'] },
  }],
  webServer: {
    command: process.platform === 'win32' ? 'npm run preview:compat' : 'npm run preview',
    url: 'http://127.0.0.1:4180',
    reuseExistingServer: !process.env['CI'],
  },
});
