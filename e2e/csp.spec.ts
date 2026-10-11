import assert from 'node:assert/strict';
import { globSync, readFileSync } from 'node:fs';
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
  "form-action 'none'",
  "require-trusted-types-for 'script'",
];

// Without upgrade-insecure-requests, browsers block mixed scripts, styles and frames and only upgrade
// mixed media (MDN mixed content), so no built file may fetch a subresource over http://.
// XML namespace identifiers such as xmlns="http://www.w3.org/2000/svg" are names, not requests.
test('no built file loads a subresource over http://', () => {
  const insecure = globSync('**/*.{html,css,svg,xml}', { cwd: 'dist' }).flatMap((file) =>
    [...readFileSync(`dist/${file}`, 'utf-8').matchAll(/(?:\b(?:src|href|srcset)=["']?|url\(["']?)[^"')>]*?http:\/\/[^\s"')>]*/g)].map(
      ([match]) => `${file}: ${match}`,
    ),
  );
  expect(insecure).toEqual([]);
});

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
    // A stylesheet, icon or image that fails to load leaves every style and layout check untested (#91).
    const failed: string[] = [];
    page.on('requestfailed', (request) => failed.push(request.url()));

    const response = await page.goto(route);
    expect(failed).toEqual([]);

    // The hashed style-src blocks inline style attributes (e.g. Shiki output), so the served HTML has none.
    assert(response !== null);
    expect(await response.text()).not.toMatch(/<[a-z][^>]*\sstyle=/);

    const csp = page.locator('meta[http-equiv="content-security-policy"]');
    await expect(csp).toHaveAttribute('content', /script-src 'self' 'sha256-/);
    await expect(csp).not.toHaveAttribute('content', /unsafe-inline/);
    await expect(csp).not.toHaveAttribute('content', /upgrade-insecure-requests/);
    for (const directive of DIRECTIVES) {
      await expect(csp).toHaveAttribute('content', new RegExp(`(^|; *)${directive}(;|$)`));
    }
    await expect(page.locator('iframe')).toHaveCount(0);
    // No page submits a form, so the privacy policy can say so and form-action stays 'none'.
    await expect(page.locator('form')).toHaveCount(0);
    // No stored theme: nothing sets data-theme, so prefers-color-scheme in global.css decides.
    await expect(page.locator('html')).not.toHaveAttribute('data-theme');
    expect(await page.evaluate(() => window.cspViolations)).toEqual([]);
  });

  for (const stored of ['dark', 'light']) {
    test(`the hashed theme script applies stored "${stored}" before module scripts on ${route}`, async ({ page }) => {
      // Astro inlines bundled scripts as modules, which run only after parsing, so the first data-theme
      // write while readyState is still "loading" can only come from the classic inline theme script.
      // It runs only if its hash is in script-src, and it costs no extra request on a first visit (#86).
      const requests: string[] = [];
      page.on('request', (request) => requests.push(new URL(request.url()).pathname));
      await page.addInitScript((value) => {
        localStorage.setItem('theme', value);
        window.firstThemeWrite = '';
        new MutationObserver((_, observer) => {
          window.firstThemeWrite = `${document.documentElement.dataset.theme} ${document.readyState}`;
          observer.disconnect();
        }).observe(document, { attributes: true, subtree: true, attributeFilter: ['data-theme'] });
      }, stored);

      await page.goto(route);

      expect(requests).not.toContain('/theme.js');
      expect(await page.evaluate(() => window.firstThemeWrite)).toBe(`${stored} loading`);
      expect(await page.evaluate(() => ['theme', 'storedTheme'].filter((name) => name in window))).toEqual([]);
      // goto resolves on load, after module scripts ran, so the Header store must keep the stored theme.
      await expect(page.locator('html')).toHaveAttribute('data-theme', stored);
    });
  }
}

// An invalid value or a throwing storage counts as no choice. The dark OS scheme proves that
// neither the theme script nor the Header store writes a light default over it.
test.describe('no stored choice', () => {
  test.use({ colorScheme: 'dark' });
  const setups: [string, () => void][] = [
    ['an invalid stored value', () => localStorage.setItem('theme', 'bogus')],
    [
      'storage that throws',
      () => {
        Storage.prototype.getItem = () => {
          throw new DOMException('denied', 'SecurityError');
        };
      },
    ],
  ];
  for (const [name, setup] of setups) {
    test(`the theme script sets no data-theme for ${name}`, async ({ page }) => {
      await page.addInitScript(setup);
      await page.addInitScript(() => {
        window.firstThemeWrite = '';
        new MutationObserver(() => {
          window.firstThemeWrite = `${document.documentElement.dataset.theme} ${document.readyState}`;
        }).observe(document, { attributes: true, subtree: true, attributeFilter: ['data-theme'] });
      });
      const errors: Error[] = [];
      page.on('pageerror', (error) => errors.push(error));

      await page.goto('/');

      expect(await page.evaluate(() => window.firstThemeWrite)).toBe('');
      await expect(page.locator('html')).not.toHaveAttribute('data-theme');
      expect(errors).toEqual([]);
    });
  }
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
