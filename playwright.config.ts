import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: ['e2e/**/*.spec.ts', 'tests/pages/**/*.spec.ts'],
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  // https://playwright.dev/docs/test-reporters#github-actions-annotations
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'html',
  use: {
    baseURL: 'http://localhost:4322',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // Trusted Types and the hash-based CSP must hold in every engine, not only Chromium.
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
  // Always a fresh foreground `astro preview` of dist/ on its own port: a reused dev server on 4321
  // has no CSP (https://docs.astro.build/en/reference/configuration-reference/#securitycsp), and
  // Astro detaches preview when it detects an agent (https://docs.astro.build/en/guides/build-with-ai/).
  webServer: {
    command: 'pnpm preview --port 4322 --ignore-lock',
    url: 'http://localhost:4322',
    reuseExistingServer: false,
    env: { ASTRO_PREVIEW_BACKGROUND: '0' },
  },
});
