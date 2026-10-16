import { defineConfig, devices } from '@playwright/test';

// Runs against the live statichost.eu staging site, not a local preview. The URL and the Basic Auth
// credentials come from the environment and never from the repo. Credentials go only to the staging origin
// (https://playwright.dev/docs/api/class-testoptions#test-options-http-credentials).
const required = (name: string): string => {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set; see playwright.staging.config.ts`);
  return value;
};

const baseURL = required('STAGING_URL');

export default defineConfig({
  testDir: '.',
  // csp.spec.ts reads the routes from dist/, so dist/ must be built from the commit staging serves.
  testMatch: ['e2e/staging/**/*.spec.ts', 'e2e/csp.spec.ts'],
  reporter: 'list',
  use: {
    baseURL,
    httpCredentials: {
      username: required('STAGING_USER'),
      password: required('STAGING_PASSWORD'),
      origin: new URL(baseURL).origin,
    },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
