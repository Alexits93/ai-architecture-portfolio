import { test, expect } from '@playwright/test';

// statichost.eu reads public/_redirects from the publish root (https://www.statichost.eu/docs/routing/).
// The old site's sitemap lists /components/, which the new build lacks (#303). Its robots.txt names
// /sitemap.xml; the new build writes /sitemap-index.xml (#332).
for (const [from, to] of [['/components/', '/'], ['/sitemap.xml', '/sitemap-index.xml']]) {
  test(`redirects the old ${from} URL to ${to} with 301`, async ({ request }) => {
    const response = await request.get(from, { maxRedirects: 0 });
    expect(response.status()).toBe(301);
    expect(new URL(response.headers().location, response.url()).pathname).toBe(to);
  });
}

// RFC 9116 section 3 requires text/plain (https://www.rfc-editor.org/rfc/rfc9116) (#314).
test('serves security.txt as plain text', async ({ request }) => {
  const response = await request.get('/.well-known/security.txt');
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toMatch(/^text\/plain\b/);
  expect(await response.text()).toContain('Contact: ');
});
