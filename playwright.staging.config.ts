import { defineConfig, devices } from "@playwright/test";

// Runs against the production site on statichost.eu, not a local preview. Production replaced the password-protected
// staging site at go-live (ADR 001), so the specs need no credentials.
const baseURL = "https://www.pa-tech.dev";

export default defineConfig({
  testDir: ".",
  // csp.spec.ts reads the routes from dist/, so dist/ must be built from the commit production serves.
  testMatch: ["e2e/staging/**/*.spec.ts", "e2e/csp.spec.ts"],
  reporter: "list",
  use: { baseURL },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
