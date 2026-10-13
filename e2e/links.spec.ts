import { globSync } from 'node:fs';
import { test, expect } from '@playwright/test';

// Every built page, read from dist/ so a new route is covered without a list edit.
const ROUTES = globSync('**/*.html', { cwd: 'dist' }).map((file) => `/${file.replace(/index\.html$/, '')}`);

// Owner 2026-10-13 (#242): a link inside a sentence is underlined, so it does not rely on colour alone
// (WCAG 2.2 F73, https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html), and hover thickens the line
// (https://design-system.service.gov.uk/styles/links/). Links open in the same tab (WCAG technique G200).
for (const route of ROUTES) {
  test(`links in the text of ${route} are underlined and thicken on hover`, async ({ page }) => {
    await page.goto(route);
    const links = page.locator(':is(main, footer) p a');
    for (const link of await links.all()) {
      const decoration = () => link.evaluate((el) => {
        const style = getComputedStyle(el);
        return { line: style.textDecorationLine, thickness: parseFloat(style.textDecorationThickness) };
      });
      const before = await decoration();
      expect(before.line).toBe('underline');
      await link.hover();
      expect((await decoration()).thickness).toBeGreaterThan(before.thickness);
    }
  });

  test(`links on ${route} open in the same tab`, async ({ page }) => {
    await page.goto(route);
    await expect(page.locator('a[target]')).toHaveCount(0);
    await expect(page.getByRole('link', { name: /opens in new tab/i })).toHaveCount(0);
  });
}
