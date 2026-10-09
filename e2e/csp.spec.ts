import { test, expect } from '@playwright/test';

// Every page must load under its CSP with zero violations, and the theme script must still run.
const ROUTES = ['/', '/blog/', '/blog/ai-agent-harness/', '/cv/', '/cookie-disclaimer/', '/privacy-policy/'];

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
    await expect(csp).toHaveAttribute('content', /require-trusted-types-for 'script'/);
    await expect(csp).toHaveAttribute('content', /frame-src 'none'/);
    await expect(csp).toHaveAttribute('content', /base-uri 'none'/);
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
