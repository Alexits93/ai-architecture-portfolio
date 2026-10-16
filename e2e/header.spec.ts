import assert from "node:assert/strict";
import { test, expect } from "@playwright/test";

// At 400% zoom (320x180 CSS px) the sticky header took 82 of 180 px; on short viewports it scrolls away instead
// (https://www.w3.org/WAI/WCAG22/Understanding/reflow.html).
const cases = [
  { width: 320, height: 180, sticky: false },
  { width: 320, height: 256, sticky: false },
  { width: 390, height: 844, sticky: true },
  { width: 1440, height: 900, sticky: true },
];

for (const { width, height, sticky } of cases) {
  test.describe(`at ${width}x${height}`, () => {
    test.use({ viewport: { width, height } });

    test(`the header ${sticky ? "stays at the top" : "scrolls away"} on a scrolled page`, async ({
      page,
    }) => {
      await page.goto("/");
      // Instant: html scrolls smoothly, and a scroll still animating would move the header after the read.
      await page.evaluate(() =>
        window.scrollTo({ top: 800, behavior: "instant" }),
      );
      const header = await page.locator(".header-wrapper").boundingBox();
      assert(header !== null);
      if (sticky) expect(header.y).toBe(0);
      else expect(header.y + header.height).toBeLessThanOrEqual(0);
    });
  });
}
