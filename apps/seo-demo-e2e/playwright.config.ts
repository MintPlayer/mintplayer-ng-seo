import { defineConfig, devices } from '@playwright/test';

const PORT = 4200;
// No file watching, no live reload, no HMR: the dev server must never reload or
// patch the page mid-test (same setup as mintplayer-ng-bootstrap's e2e).
const NO_RELOAD = '--watch=false --live-reload=false --hmr=false';
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 1 : 0,
  workers: process.env['CI'] ? 2 : undefined,
  reporter: 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
  ],
  // Angular's dev-server in production mode: AOT and the prod environment
  // apply, only the on-disk artifact differs from a real `nx build`.
  webServer: {
    command: `npx nx serve seo-demo --configuration=production --port=${PORT} ${NO_RELOAD}`,
    url: baseURL,
    reuseExistingServer: !process.env['CI'],
    timeout: 180_000,
  },
});
