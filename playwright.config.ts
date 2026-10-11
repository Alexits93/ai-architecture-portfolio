import { defineConfig, devices } from '@playwright/test';

// Local WebKit (pnpm test:e2e:webkit): the host lacks WebKit's system libraries, so the browser runs in
// the Playwright image of the installed version under Podman and connects back to the preview server
// on the host loopback (https://playwright.dev/docs/docker, tests/config/playwright-webkit-podman.spec.ts).
const webkitInPodman = process.env.PW_WEBKIT_PODMAN === '1';
const PLAYWRIGHT_VERSION = '1.64.0';

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
      use: {
        ...devices['Desktop Safari'],
        connectOptions: webkitInPodman ? { wsEndpoint: 'ws://127.0.0.1:3000/', exposeNetwork: '<loopback>' } : undefined,
      },
    },
  ],
  // Always a fresh foreground `astro preview` of dist/ on its own port: a reused dev server on 4321
  // has no CSP (https://docs.astro.build/en/reference/configuration-reference/#securitycsp), and
  // Astro detaches preview when it detects an agent (https://docs.astro.build/en/guides/build-with-ai/).
  // An array starts every entry before the run and stops it after (https://playwright.dev/docs/test-webserver).
  webServer: [
    {
      command: 'pnpm preview --port 4322 --ignore-lock',
      url: 'http://localhost:4322',
      reuseExistingServer: false,
      env: { ASTRO_PREVIEW_BACKGROUND: '0' },
    },
    ...(webkitInPodman
      ? [
          {
            name: 'WebKit',
            command: `podman run --rm --init -p 127.0.0.1:3000:3000 --workdir /home/pwuser --user pwuser mcr.microsoft.com/playwright:v${PLAYWRIGHT_VERSION}-noble /bin/sh -c "npx -y playwright@${PLAYWRIGHT_VERSION} run-server --port 3000 --host 0.0.0.0"`,
            wait: { stdout: /Listening on ws:/ },
            reuseExistingServer: false,
            // The default SIGKILL would leave the container running; podman run forwards SIGTERM to it.
            gracefulShutdown: { signal: 'SIGTERM' as const, timeout: 10_000 },
          },
        ]
      : []),
  ],
});
