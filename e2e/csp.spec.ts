import { globSync } from 'node:fs';
import { test, expect } from '@playwright/test';

// Every built page must load under its CSP with zero violations, and the theme script must still run.
// Read from dist/ so new pages, such as a post with a code fence or a 404.html, are checked without a list edit.
const ROUTES = globSync('**/*.html', { cwd: 'dist' }).map((file) => `/${file.replace(/index\.html$/, '')}`);
test('finds the built pages', () => expect(ROUTES.length).toBeGreaterThan(5));

// Every directive from astro.config.mjs, matched whole so a widened value fails.
const DIRECTIVES = [
  "default-src 'self'",
  "img-src 'self' data:",
  "font-src 'self'",
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'self'",
  "require-trusted-types-for 'script'",
  'upgrade-insecure-requests',
];

declare global {
  interface Window {
    cspViolations: string[];
    firstThemeWrite: string;
  }
}

for (const route of ROUTES) {
  test(`no CSP violations on ${route}`, async ({ page }) => {
    // Registered before any page script runs; violations bubble to window (MDN securitypolicyviolation).
    await page.addInitScript(() => {
      window.cspViolations = [];
      window.addEventListener('securitypolicyviolation', (e) => {
        window.cspViolations.push(`${e.effectiveDirective} blocked ${e.blockedURI}`);
      });
    });

    const response = await page.goto(route);

    // The hashed style-src blocks inline style attributes (e.g. Shiki output), so the served HTML has none.
    expect(await response?.text()).not.toMatch(/<[a-z][^>]*\sstyle=/);

    const csp = page.locator('meta[http-equiv="content-security-policy"]');
    await expect(csp).toHaveAttribute('content', /script-src 'self' 'sha256-/);
    await expect(csp).not.toHaveAttribute('content', /unsafe-inline/);
    for (const directive of DIRECTIVES) {
      await expect(csp).toHaveAttribute('content', new RegExp(`(^|; *)${directive}(;|$)`));
    }
    await expect(page.locator('iframe')).toHaveCount(0);
    await expect(page.locator('html')).toHaveAttribute('data-theme', /^(light|dark)$/);
    expect(await page.evaluate(() => window.cspViolations)).toEqual([]);
  });

  // An invalid stored value falls back to light.
  for (const [stored, expected] of [['dark', 'dark'], ['light', 'light'], ['bogus', 'light']]) {
    test(`/theme.js applies stored "${stored}" before module scripts on ${route}`, async ({ page }) => {
      // Astro inlines bundled scripts as modules, which run only after parsing, so the first
      // data-theme write while readyState is still "loading" can only come from the blocking /theme.js.
      await page.addInitScript((value) => {
        localStorage.setItem('theme', value);
        window.firstThemeWrite = '';
        new MutationObserver((_, observer) => {
          window.firstThemeWrite = `${document.documentElement.dataset.theme} ${document.readyState}`;
          observer.disconnect();
        }).observe(document, { attributes: true, subtree: true, attributeFilter: ['data-theme'] });
      }, stored);

      const themeScript = page.waitForResponse('**/theme.js');
      await page.goto(route);

      expect((await themeScript).status()).toBe(200);
      expect(await page.evaluate(() => window.firstThemeWrite)).toBe(`${expected} loading`);
    });
  }
}

test('/theme.js falls back to light when storage throws', async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => {
      throw new DOMException('denied', 'SecurityError');
    };
    window.firstThemeWrite = '';
    new MutationObserver((_, observer) => {
      window.firstThemeWrite = `${document.documentElement.dataset.theme} ${document.readyState}`;
      observer.disconnect();
    }).observe(document, { attributes: true, subtree: true, attributeFilter: ['data-theme'] });
  });
  await page.goto('/');
  expect(await page.evaluate(() => window.firstThemeWrite)).toBe('light loading');
});

test('blocks an unhashed inline script', async ({ page }) => {
  // Serve the real page with one extra inline script after the CSP meta (https://playwright.dev/docs/api/class-route#route-fetch).
  await page.route('/', async (route) => {
    const response = await route.fetch();
    const body = (await response.text()).replace('</body>', '<script>window.injectedRan = true;</script></body>');
    await route.fulfill({ response, body });
  });
  await page.addInitScript(() => {
    window.cspViolations = [];
    window.addEventListener('securitypolicyviolation', (e) => window.cspViolations.push(e.effectiveDirective));
  });
  await page.goto('/');
  expect(await page.evaluate(() => 'injectedRan' in window)).toBe(false);
  expect(await page.evaluate(() => window.cspViolations)).toContain('script-src-elem');
});

test('Trusted Types rejects a string assigned to innerHTML', async ({ page }) => {
  await page.goto('/');
  const error = await page.evaluate(() => {
    try {
      document.body.innerHTML = '<img src=x>';
      return 'none';
    } catch (e) {
      return e instanceof TypeError ? 'TypeError' : String(e);
    }
  });
  expect(error).toBe('TypeError');
});
