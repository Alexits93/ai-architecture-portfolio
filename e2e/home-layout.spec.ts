import { test, expect } from "@playwright/test";
import { SITE } from "../src/consts";

// Reduced motion keeps the hero in its final position, so the boxes do not move while the tests measure them.
test.use({ reducedMotion: "reduce" });

// No block widens the page; the giant contact word is clipped, not scrolled to.
for (const width of [320, 390, 1440, 1920]) {
  test.describe(`at ${width} px`, () => {
    test.use({ viewport: { width, height: 900 } });

    test("the page has no horizontal scroll", async ({ page }) => {
      await page.goto("/");
      // Read the numbers inside the callback: evaluate serializes a returned DOM node to a string.
      // scrollWidth can be below clientWidth where a stable scrollbar gutter narrows the content box.
      const { scrollWidth, clientWidth } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
    });
  });
}

// WCAG 1.4.12: with the text spacing a user may set, nothing widens the page. The spacing goes in as a style
// tag, which the hashed CSP would block, so this test bypasses it.
test.describe("with the WCAG 1.4.12 text spacing at 390 px", () => {
  test.use({ viewport: { width: 390, height: 900 }, bypassCSP: true });

  test("the page has no horizontal scroll", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => document.fonts.ready);
    await page.addStyleTag({
      content:
        "* { line-height: 1.5 !important; letter-spacing: .12em !important; word-spacing: .16em !important; } p { margin-bottom: 2em !important; }",
    });
    const { scrollWidth, clientWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  });
});

// Home shows the role as the hero's first kicker; /cv/ shows it under the name in the hgroup.
test("home and /cv/ show the same site-wide title", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#hero .kicker").first()).toHaveText(SITE.role);
  await expect(page.locator("#hero .kicker").first()).toBeVisible();
  await page.goto("/cv/");
  await expect(page.locator("#about-me hgroup .role")).toHaveText(SITE.role);
  await expect(page.locator("#about-me hgroup .role")).toBeVisible();
});

// The placeholder portrait has a fixed size, so nothing moves while the page loads. Chromium is the only
// engine that reports layout-shift entries (https://developer.mozilla.org/en-US/docs/Web/API/LayoutShift).
for (const width of [320, 1280]) {
  test.describe(`at ${width} px`, () => {
    test.use({ viewport: { width, height: 900 } });

    test("the home hero causes no layout shift", async ({
      page,
      browserName,
    }) => {
      test.skip(
        browserName !== "chromium",
        "layout-shift entries exist only in Chromium",
      );
      await page.goto("/");
      await page.evaluate(() => document.fonts.ready);
      const shift = await page.evaluate(
        () =>
          new Promise<number>((resolve) => {
            new PerformanceObserver((list) => {
              // TypeScript's DOM types have no LayoutShift, so the value is read through an in-check.
              const values = list
                .getEntries()
                .map((entry) =>
                  "value" in entry && typeof entry.value === "number"
                    ? entry.value
                    : 0,
                );
              resolve(values.reduce((sum, value) => sum + value, 0));
            }).observe({ type: "layout-shift", buffered: true });
            setTimeout(() => resolve(0), 500);
          }),
      );
      expect(shift).toBe(0);
    });
  });
}

// On a phone the owner's portrait is the Largest Contentful Paint, which is why it loads
// eagerly at high priority. With motion allowed, as most visitors have it; under reduced motion the hero text paints at
// once and its block is a few percent larger, which costs no time.
test.describe("at 390 px with motion allowed", () => {
  test.use({
    viewport: { width: 390, height: 844 },
    reducedMotion: "no-preference",
  });

  test("the portrait photo is the Largest Contentful Paint", async ({
    page,
    browserName,
  }) => {
    test.skip(
      browserName !== "chromium",
      "largest-contentful-paint entries exist only in Chromium",
    );
    await page.goto("/");
    // The latest LCP candidate so far; until the photo paints, it is text.
    const latestIsPortrait = () =>
      page.evaluate(
        () =>
          new Promise<boolean>((resolve) => {
            new PerformanceObserver((list) => {
              const entries = list.getEntries();
              const last = entries[entries.length - 1];
              resolve(
                last instanceof LargestContentfulPaint &&
                  last.element !== null &&
                  last.element.matches("#hero .portrait-face img"),
              );
            }).observe({ type: "largest-contentful-paint", buffered: true });
          }),
      );
    await expect.poll(latestIsPortrait).toBe(true);
  });
});

// From 64rem the name halves sit beside the portrait; each half and its one-line kicker must fit its column, not run
// into the page padding.
for (const width of [1024, 1280, 1440]) {
  test.describe(`hero at ${width} px`, () => {
    test.use({ viewport: { width, height: 900 }, reducedMotion: "reduce" });

    test("the name halves and kickers stay inside the content box of main", async ({
      page,
    }) => {
      await page.goto("/");
      await page.evaluate(() => document.fonts.ready);
      const { left, right, words } = await page.evaluate(() => {
        const main = document.querySelector("main");
        if (main === null) throw new Error("no main");
        const box = main.getBoundingClientRect();
        const style = getComputedStyle(main);
        return {
          left: box.left + parseFloat(style.paddingLeft),
          right: box.right - parseFloat(style.paddingRight),
          words: [
            ...document.querySelectorAll("#hero .word, #hero .kicker"),
          ].map((word) => {
            const range = document.createRange();
            range.selectNodeContents(word);
            const text = range.getBoundingClientRect();
            return { left: text.left, right: text.right };
          }),
        };
      });
      expect(words).toHaveLength(4);
      for (const word of words) {
        expect(word.left).toBeGreaterThanOrEqual(left);
        expect(word.right).toBeLessThanOrEqual(right);
      }
    });
  });
}
