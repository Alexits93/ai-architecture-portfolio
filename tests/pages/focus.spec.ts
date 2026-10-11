import { globSync } from 'node:fs';
import { test, expect } from '@playwright/test';

// Every built page, read from dist/ so a new route is covered without a list edit.
const ROUTES = globSync('**/*.html', { cwd: 'dist' }).map((file) => `/${file.replace(/index\.html$/, '')}`);

// Owner 2026-10-11: a focus outline keeps a gap to what it outlines, so the outline does not touch the text.
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
        return { name: `${el.tagName.toLowerCase()} ${el.textContent.trim().slice(0, 30)}`, style: style.outlineStyle, offset: parseFloat(style.outlineOffset) };
      });
      if (focused !== null && focused.style !== 'none' && focused.offset < 2) touching.push(focused.name);
    }
    expect(touching).toEqual([]);
  });
}
