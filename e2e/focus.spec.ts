import { globSync } from 'node:fs';
import { test, expect } from '@playwright/test';

// Every built page, read from dist/ so a new route is covered without a list edit.
const ROUTES = globSync('**/*.html', { cwd: 'dist' }).map((file) => `/${file.replace(/index\.html$/, '')}`);

// Owner 2026-10-11: a focus outline keeps a gap to what it outlines, so the outline does not touch the text.
// 4px still let glyphs overflowing their box (negative letter-spacing, logo ink at the SVG edge) touch it, and
// the theme toggle fell back to the browser's 1px ring; so 8px and the site's 2px solid outline everywhere (#157).
for (const route of ROUTES) {
  test(`every keyboard focus outline on ${route} has an offset`, async ({ page }) => {
    await page.goto(route);
    const touching: string[] = [];
    for (let i = 0; i < 40; i++) {
      await page.keyboard.press('Tab');
      const focused = await page.evaluate(() => {
        const el = document.activeElement;
        if (el === null || el === document.body || !el.matches(':focus-visible')) return null;
        const style = getComputedStyle(el);
        return {
          name: `${el.tagName.toLowerCase()} ${el.textContent.trim().slice(0, 30)}`,
          outline: `${style.outlineStyle} ${style.outlineWidth}`,
          offset: parseFloat(style.outlineOffset),
        };
      });
      if (focused !== null && (focused.outline !== 'solid 2px' || focused.offset < 8)) touching.push(focused.name);
    }
    expect(touching).toEqual([]);
  });
}
