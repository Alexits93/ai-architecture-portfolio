import { test, expect } from '@playwright/test';

// statichost.eu reads public/_redirects from the publish root (https://www.statichost.eu/docs/routing/).
// The old site's sitemap lists /components/, which the new build lacks (#303).
test('redirects the old /components/ URL to home with 301', async ({ request }) => {
  const response = await request.get('/components/', { maxRedirects: 0 });
  expect(response.status()).toBe(301);
  expect(new URL(response.headers().location, response.url()).pathname).toBe('/');
});

// RFC 9116 section 3 requires text/plain (https://www.rfc-editor.org/rfc/rfc9116) (#314).
test('serves security.txt as plain text', async ({ request }) => {
  const response = await request.get('/.well-known/security.txt');
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toMatch(/^text\/plain\b/);
  expect(await response.text()).toContain('Contact: ');
});
