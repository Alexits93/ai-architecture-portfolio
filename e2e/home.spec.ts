import { globSync } from "node:fs";
import { test, expect, type Page } from "@playwright/test";
import { SITE } from "../src/consts";

// The home sections on the built site. Vitest has no content store, so this is where the collections are checked
// to reach the page. Copy is the owner's to check; these tests check structure, order and keyboard use.
test.use({ reducedMotion: "reduce" });

const POSTS = globSync("blog/*/index.html", { cwd: "dist" })
  .map((file) => `/${file.replace(/index\.html$/, "")}`)
  .filter((route) => route !== "/blog/category/");

const datetimes = (page: Page, selector: string) =>
  page
    .locator(selector)
    .evaluateAll((times) => times.map((time) => time.getAttribute("datetime")));

// Astro renders a component's processed <script> in place, so the hero's script is a child of main.
test("renders the sections in order", async ({ page }) => {
  await page.goto("/");
  const ids = await page
    .locator("main > :not(script)")
    .evaluateAll((blocks) => blocks.map((block) => block.id));
  expect(ids).toEqual([
    "hero",
    "get-to-know",
    "now",
    "services",
    "work",
    "principles",
    "writing",
    "faq",
    "contact",
  ]);
});

test("the now block lists its items under a dated heading", async ({
  page,
}) => {
  await page.goto("/");
  const now = page.getByRole("region", { name: "Now" });
  await expect(
    now.getByRole("heading", { level: 2, name: "Now" }),
  ).toBeVisible();
  expect(await now.getByRole("listitem").count()).toBeGreaterThan(0);
  await expect(now.locator("time")).toHaveAttribute(
    "datetime",
    /^\d{4}-\d{2}-\d{2}$/,
  );
});

test("the principles list sits under its heading", async ({ page }) => {
  await page.goto("/");
  const principles = page.getByRole("region", { name: "Principles" });
  await expect(
    principles.getByRole("heading", { level: 2, name: "Principles" }),
  ).toBeVisible();
  expect(await principles.getByRole("listitem").count()).toBeGreaterThan(0);
});

test.describe("work rows", () => {
  test("list the positions newest first", async ({ page }) => {
    await page.goto("/");
    const years = await page
      .getByRole("region", { name: "Work experience" })
      .locator(".years")
      .allTextContents();
    const starts = years.map((range) => parseInt(range, 10));
    expect(starts.length).toBeGreaterThan(1);
    expect(starts).toEqual(starts.toSorted((a, b) => b - a));
  });

  test("the Full CV pill opens /cv/", async ({ page }) => {
    await page.goto("/");
    await page
      .getByRole("region", { name: "Work experience" })
      .getByRole("link", { name: "Full CV" })
      .click();
    await expect(page).toHaveURL(/\/cv\/$/);
  });
});

test.describe("writing list", () => {
  test("finds the built posts", () => expect(POSTS.length).toBeGreaterThan(0));

  test("links to built posts, each once, newest first, then to /blog/", async ({
    page,
  }) => {
    await page.goto("/");
    const hrefs = await page
      .locator("#writing li a")
      .evaluateAll((links) => links.map((link) => link.getAttribute("href")));
    const dates = await datetimes(page, "#writing li time");

    expect(hrefs).toHaveLength(Math.min(POSTS.length, 5));
    for (const href of hrefs) expect(POSTS).toContain(href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
    expect(dates).toEqual(dates.toSorted().reverse());
    await expect(
      page.locator("#writing").getByRole("link", { name: "All posts" }),
    ).toHaveAttribute("href", "/blog/");
  });

  test("Tab reaches each post title once", async ({ page }) => {
    await page.goto("/");
    const links = page.locator("#writing a");
    const count = await links.count();
    await links.first().focus();
    const focused: (string | null)[] = [];
    for (let i = 0; i < count; i += 1) {
      focused.push(
        await page.evaluate(
          () => document.activeElement && document.activeElement.textContent,
        ),
      );
      await page.keyboard.press("Tab");
    }
    expect(focused).toEqual(await links.allTextContents());
  });
});

test.describe("FAQ", () => {
  test("opens one answer at a time", async ({ page }) => {
    await page.goto("/");
    const questions = page
      .getByRole("region", { name: "Frequently asked" })
      .locator("details");
    expect(await questions.count()).toBeGreaterThan(1);
    await questions.nth(0).locator("summary").click();
    await expect(questions.nth(0)).toHaveAttribute("open");
    await questions.nth(1).locator("summary").click();
    await expect(questions.nth(1)).toHaveAttribute("open");
    await expect(questions.nth(0)).not.toHaveAttribute("open");
  });

  test("every question is reachable with Tab and toggles with Enter and Space", async ({
    page,
  }) => {
    await page.goto("/");
    const summaries = page.locator("#faq summary");
    const questions = page.locator("#faq details");
    const count = await summaries.count();

    await summaries.first().focus();
    for (let i = 0; i < count; i++) {
      await expect(summaries.nth(i)).toBeFocused();
      await page.keyboard.press(i % 2 === 0 ? "Enter" : "Space");
      await expect(questions.nth(i)).toHaveAttribute("open");
      await page.keyboard.press("Enter");
      await expect(questions.nth(i)).not.toHaveAttribute("open");
      await page.keyboard.press("Tab");
    }
  });

  // WCAG 2.3.3: no fade under reduced motion. Neither engine lists ::details-content transitions in getAnimations(),
  // so the declared transition stands in for the motion (https://developer.mozilla.org/en-US/docs/Web/CSS/::details-content).
  test("an answer opens without a transition under reduced motion", async ({
    page,
  }) => {
    await page.goto("/");
    const durations = await page
      .locator("#faq details")
      .first()
      .evaluate((details) => {
        const summary = details.querySelector("summary");
        if (summary === null) throw new Error("no summary");
        summary.click();
        return [
          ...getComputedStyle(
            details,
            "::details-content",
          ).transitionDuration.split(", "),
          getComputedStyle(summary, "::after").transitionDuration,
        ].map(parseFloat);
      });
    for (const duration of durations) expect(duration).toBeLessThan(0.001);
    await expect(
      page.locator("#faq details").first().locator("p"),
    ).toBeVisible();
  });
});

test.describe("contact", () => {
  test("Tab walks the email and the social links in order", async ({
    page,
  }) => {
    await page.goto("/");
    const section = page.getByRole("region", { name: "Contact" });
    const names = [
      SITE.email,
      "GitHub",
      "LinkedIn",
      "Stack Overflow",
      "Instagram",
    ];
    await section.getByRole("link", { name: names[0] }).focus();
    for (const name of names) {
      await expect(section.getByRole("link", { name })).toBeFocused();
      await page.keyboard.press("Tab");
    }
    await expect(section.getByRole("link")).toHaveCount(names.length);
  });

  // The CSP allows no form or frame and default-src 'self', so a click on either mailto: link must raise no violation
  // and leave the page where it is.
  test("the contact and footer email links open mailto: without a CSP violation", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      window.addEventListener("securitypolicyviolation", (event) => {
        document.documentElement.dataset.cspViolation = `${event.effectiveDirective} blocked ${event.blockedURI}`;
      });
    });
    await page.goto("/");
    const links = [
      page
        .getByRole("region", { name: "Contact" })
        .getByRole("link", { name: SITE.email }),
      page.getByRole("contentinfo").getByRole("link", { name: SITE.email }),
    ];
    for (const link of links) {
      await expect(link).toHaveAttribute("href", `mailto:${SITE.email}`);
      await link.click();
      // Two frames give a violation from the click time to be reported.
      await page.evaluate(
        () =>
          new Promise((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(resolve)),
          ),
      );
      await expect(page).toHaveURL("/");
      await expect(page.locator("html")).not.toHaveAttribute(
        "data-csp-violation",
      );
    }
  });
});

// The giant contact word must not be cut off at any width.
for (const width of [320, 390, 1440, 1920]) {
  test(`the giant word stays inside the contact column at ${width} px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await page.evaluate(() => document.fonts.ready);
    const { word, column } = await page
      .locator("#contact .giant")
      .evaluate((giant) => {
        const range = document.createRange();
        range.selectNodeContents(giant);
        const text = range.getBoundingClientRect();
        const box = giant.getBoundingClientRect();
        return {
          word: { left: text.left, right: text.right },
          column: { left: box.left, right: box.right },
        };
      });
    expect(word.left).toBeGreaterThanOrEqual(column.left);
    expect(word.right).toBeLessThanOrEqual(column.right);
  });
}
