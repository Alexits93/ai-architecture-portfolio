import { test, expect, type Page } from "@playwright/test";

// "What I do best" on the built home page: the sticky stacking and the scroll-driven settle.

const settleRuns = (page: Page) =>
  page
    .locator("#services .card")
    .first()
    .evaluate((card) =>
      card
        .getAnimations()
        .some(
          (animation) =>
            animation instanceof CSSAnimation &&
            animation.animationName === "card-settle",
        ),
    );

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce", viewport: { width: 1280, height: 900 } });

  // At the end of the stack every card has reached its sticky offset, so each one overlaps the one before it.
  // Without sticky they would sit a screen apart.
  test("the cards pile up while the page scrolls", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => {
      const stack = document.querySelector("#services ol");
      if (stack === null) throw new Error("no stack");
      const box = stack.getBoundingClientRect();
      window.scrollTo(0, window.scrollY + box.bottom - window.innerHeight);
    });
    const boxes = await page.locator("#services .card").evaluateAll((cards) =>
      cards.map((card) => {
        const box = card.getBoundingClientRect();
        return { top: box.top, bottom: box.bottom };
      }),
    );
    expect(boxes).toHaveLength(4);
    for (const [index, box] of boxes.entries()) {
      const previous = boxes[index - 1];
      if (previous === undefined) continue;
      expect(box.top).toBeGreaterThan(previous.top);
      expect(box.top).toBeLessThan(previous.bottom);
    }
  });

  test("the cards show without the settle animation", async ({ page }) => {
    await page.goto("/");
    expect(await settleRuns(page)).toBe(false);
  });
});

test.describe("motion allowed", () => {
  test.use({ reducedMotion: "no-preference" });

  test("a card settles from a stronger tilt where scroll timelines exist", async ({
    page,
  }) => {
    await page.goto("/");
    test.skip(
      !(await page.evaluate(() => CSS.supports("animation-timeline: view()"))),
      "no scroll-driven animations",
    );
    expect(await settleRuns(page)).toBe(true);
  });
});

// At 400% zoom (320x180 CSS px) each card stuck at 112 px or lower and the next card covered its text before it
// could be read (WCAG 1.4.10). Short viewports let the cards scroll like normal content.
test.describe("at 320x180", () => {
  test.use({ reducedMotion: "reduce", viewport: { width: 320, height: 180 } });

  test("every card text can be read without another card on top", async ({
    page,
  }) => {
    await page.goto("/");
    for (const text of await page
      .locator("#services .card > p:not(.eyebrow)")
      .all()) {
      await text.evaluate((el) =>
        el.scrollIntoView({ block: "center", behavior: "instant" }),
      );
      const uncovered = await text.evaluate((el) => {
        const box = el.getBoundingClientRect();
        const hit = document.elementFromPoint(
          box.left + box.width / 2,
          box.top + box.height / 2,
        );
        return hit !== null && el.contains(hit);
      });
      expect(uncovered).toBe(true);
    }
  });
});
