import { test, expect } from '@playwright/test';

// The server renders the PNG bytes, no browser engine draws them, so one project holds the baseline.
// https://playwright.dev/docs/test-snapshots
test('og.png matches the reviewed baseline', async ({ request, browserName }) => {
  test.skip(browserName !== 'chromium', 'engine-independent server output');

  const response = await request.get('/og.png');

  expect(response.status()).toBe(200);
  expect(await response.body()).toMatchSnapshot('og.png');
});
