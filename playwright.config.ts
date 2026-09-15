import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  reporter: [['html', { open: 'never' }]],
  use: { baseURL: 'http://127.0.0.1:8081', trace: 'on-first-retry' },
  webServer: { command: 'npm run web -- --port 8081', url: 'http://127.0.0.1:8081', reuseExistingServer: !process.env.CI },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});
