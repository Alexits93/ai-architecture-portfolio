import { test, expect } from '@playwright/test';

// Every page must load under its CSP with zero violations, and the theme script must still run.
const ROUTES = ['/', '/blog/', '/blog/ai-agent-harness/', '/cv/', '/cookie-disclaimer/', '/privacy-policy/'];

declare global {
  interface Window {
    cspViolations: string[];
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

    await page.goto(route);

    const csp = page.locator('meta[http-equiv="content-security-policy"]');
    await expect(csp).toHaveAttribute('content', /script-src 'self' 'sha256-/);
    await expect(csp).not.toHaveAttribute('content', /unsafe-inline/);
    await expect(page.locator('html')).toHaveAttribute('data-theme', /^(light|dark)$/);
    expect(await page.evaluate(() => window.cspViolations)).toEqual([]);
  });
}
