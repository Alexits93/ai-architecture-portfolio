import { test, expect } from "@playwright/test";

// The server renders the PNG bytes, no browser engine draws them, so one project holds the baseline.
// The baseline is Linux-only (CI, local dev and the Playwright Podman image): the default
// snapshotPathTemplate names it per {platform}, so on another OS the missing baseline fails the test.
// https://playwright.dev/docs/test-snapshots
// https://playwright.dev/docs/api/class-testconfig#test-config-snapshot-path-template
test("og.png matches the reviewed baseline", async ({
  request,
  browserName,
}) => {
  test.skip(browserName !== "chromium", "engine-independent server output");

  const response = await request.get("/og.png");

  expect(response.status()).toBe(200);
  expect(await response.body()).toMatchSnapshot("og.png");
});
