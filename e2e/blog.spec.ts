import assert from "node:assert/strict";
import { globSync } from "node:fs";
import { test, expect, type Page } from "@playwright/test";
import { readPostDates } from "../src/lib/sitemap-lastmod";

// Every built post page, e.g. /blog/<slug>/.
const POST_ROUTES = globSync("blog/*/index.html", { cwd: "dist" }).map(
  (file) => `/${file.replace(/index\.html$/, "")}`,
);

// A category gets a page and a pill only once it has a post, so no link leads to an empty list.
const CATEGORIES_WITH_POSTS = [
  ...new Set(readPostDates("src/content/blog").map((post) => post.category)),
].toSorted();
const CATEGORY_PAGES = globSync("blog/category/*/index.html", { cwd: "dist" })
  .map((file) => file.split("/")[2])
  .toSorted();
const NAV_LINKS = ["All", ...CATEGORIES_WITH_POSTS];

const BLOG_ROUTES = [
  { route: "/blog/", current: "All", tag: null },
  ...CATEGORIES_WITH_POSTS.map((category) => ({
    route: `/blog/category/${category.toLowerCase()}/`,
    current: category,
    tag: category,
  })),
];

const cardHrefs = (page: Page, scope: string) =>
  page
    .locator(`${scope} .blog-post-thumbnail`)
    .evaluateAll((cards) => cards.map((card) => card.getAttribute("href")));

const categoryNav = (page: Page) =>
  page.getByRole("navigation", { name: "Blog categories" });

// Each card's category, from the kicker the thumbnail renders.
const cardCategories = (page: Page) =>
  page.locator(".blog-grid .blog-post-thumbnail .eyebrow").allTextContents();

test.describe("Blog category pages", () => {
  test("builds a page for exactly the categories with posts", () =>
    expect(CATEGORY_PAGES).toEqual(
      CATEGORIES_WITH_POSTS.map((category) => category.toLowerCase()),
    ));

  for (const { route, current, tag } of BLOG_ROUTES) {
    test(`${route} lists its posts and marks only "${current}" as the current page`, async ({
      page,
    }) => {
      const response = await page.goto(route);
      assert(response !== null);
      const html = await response.text();
      for (const removed of [
        "blog-feed-interactive",
        "data-tags",
        "blog-post-filter",
      ])
        expect(html).not.toContain(removed);

      const links = categoryNav(page).getByRole("link");
      await expect(links).toHaveText(NAV_LINKS);
      await expect(categoryNav(page).locator("[aria-current]")).toHaveCount(1);
      await expect(
        categoryNav(page).getByRole("link", { name: current, exact: true }),
      ).toHaveAttribute("aria-current", "page");

      const categories = (await cardCategories(page)).map((text) =>
        text.trim(),
      );
      expect(categories.length).toBeGreaterThan(0);
      if (tag !== null) expect(new Set(categories)).toEqual(new Set([tag]));
    });
  }
});

test.describe("Blog category listing", () => {
  test("lists every post on /blog/", async ({ page }) => {
    await page.goto("/blog/");
    const hrefs = await page
      .locator(".blog-grid .blog-post-thumbnail")
      .evaluateAll((cards) => cards.map((card) => card.getAttribute("href")));
    expect(hrefs.toSorted()).toEqual(POST_ROUTES.toSorted());
  });

  test.describe("without JavaScript", () => {
    test.use({ javaScriptEnabled: false });

    test("shows the same links and posts", async ({ page }) => {
      await page.goto("/blog/");
      await expect(categoryNav(page).getByRole("link")).toHaveText(NAV_LINKS);
      await expect(page.locator(".blog-grid .blog-post-thumbnail")).toHaveCount(
        POST_ROUTES.length,
      );
      for (const card of await page
        .locator(".blog-grid .blog-post-thumbnail")
        .all())
        await expect(card).toBeVisible();
    });
  });

  test("returns to the category page with only its posts after Back", async ({
    page,
  }) => {
    await page.goto("/blog/category/ai/");
    await page.locator(".blog-grid .blog-post-thumbnail").first().click();
    await expect(page).toHaveURL(/\/blog\/[a-z0-9-]+\/$/);
    await page.goBack();
    await expect(page).toHaveURL(/\/blog\/category\/ai\/$/);
    expect(
      new Set((await cardCategories(page)).map((text) => text.trim())),
    ).toEqual(new Set(["AI"]));
  });
});

test.describe("Blog category navigation by keyboard", () => {
  test("reaches every category with Tab and Enter, with a visible focus outline", async ({
    page,
  }) => {
    await page.goto("/blog/");
    for (const { route, current } of BLOG_ROUTES.slice(1)) {
      const link = categoryNav(page).getByRole("link", {
        name: current,
        exact: true,
      });
      for (
        let i = 0;
        i < 30 && !(await link.evaluate((el) => el === document.activeElement));
        i++
      ) {
        await page.keyboard.press("Tab");
      }
      await expect(link).toBeFocused();
      expect(await link.evaluate((el) => el.matches(":focus-visible"))).toBe(
        true,
      );
      await expect(link).not.toHaveCSS("outline-style", "none");
      await page.keyboard.press("Enter");
      await expect(page).toHaveURL(new RegExp(`${route}$`));
      await expect(
        categoryNav(page).getByRole("link", { name: current, exact: true }),
      ).toHaveAttribute("aria-current", "page");
    }
  });
});

// test.use sets the viewport before the page opens (https://playwright.dev/docs/emulation#viewport);
// page.setViewportSize hangs headed Firefox on KDE Wayland.
for (const width of [320, 375]) {
  test.describe(`Blog pages on a ${width} px viewport`, () => {
    test.use({ viewport: { width, height: 800 } });

    for (const { route } of BLOG_ROUTES) {
      for (const theme of ["light", "dark"]) {
        test(`${route} fits a ${width} px viewport in the ${theme} theme`, async ({
          page,
        }) => {
          await page.addInitScript(
            (value) => localStorage.setItem("theme", value),
            theme,
          );
          await page.goto(route);
          await expect(page.locator("html")).toHaveAttribute(
            "data-theme",
            theme,
          );
          // Names every element past the right edge, so a failure shows the cause.
          const pastEdge = await page.evaluate(() =>
            [...document.querySelectorAll("body *")]
              .filter(
                (el) =>
                  el.getBoundingClientRect().right >
                  document.documentElement.clientWidth + 1,
              )
              .map(
                (el) =>
                  `${el.tagName.toLowerCase()}.${[...el.classList].join(".")} right=${Math.round(el.getBoundingClientRect().right)}`,
              ),
          );
          expect(pastEdge).toEqual([]);
          const overflow = await page.evaluate(
            () =>
              document.documentElement.scrollWidth -
              document.documentElement.clientWidth,
          );
          expect(overflow).toBeLessThanOrEqual(0);
        });
      }
    }
  });
}

test.describe("Category link on a post page", () => {
  for (const route of POST_ROUTES) {
    test(`${route} links its category to the category page`, async ({
      page,
    }) => {
      await page.goto(route);
      const link = page.locator("#post-hero .eyebrow a");
      await expect(link).toHaveCount(1);
      const name = await link.textContent();
      assert(name !== null);
      expect(await link.getAttribute("href")).toBe(
        `/blog/category/${name.trim().toLowerCase()}/`,
      );
    });
  }
});

test.describe("Recommended articles on a post page", () => {
  test("finds the built post pages", () =>
    expect(POST_ROUTES.length).toBeGreaterThan(0));

  for (const route of POST_ROUTES) {
    // Every other post, newest first, up to 3; the blog index lists the posts newest first. Without another post the
    // block is left out, so no heading stands over an empty grid.
    test(`${route} recommends the newest other posts`, async ({ page }) => {
      await page.goto("/blog/");
      const newest = await cardHrefs(page, ".blog-grid");
      await page.goto(route);
      const expected = newest.filter((href) => href !== route).slice(0, 3);
      expect(await cardHrefs(page, "#blog-section")).toEqual(expected);
      await expect(page.locator("#blog-section")).toHaveCount(
        expected.length === 0 ? 0 : 1,
      );
    });
  }
});

// Firefox gave a card link that only wraps an <article> no name, so Orca read "link". Each card link is named by
// its title, on the blog index and under a post.
for (const route of ["/blog/", POST_ROUTES[0]]) {
  test(`card links on ${route} are named by their post title`, async ({
    page,
  }) => {
    await page.goto(route);
    const cards = await page.locator(".blog-post-thumbnail").all();
    test.skip(
      route !== "/blog/" && cards.length === 0,
      "a post shows cards once another post exists",
    );
    expect(cards.length).toBeGreaterThan(0);
    for (const card of cards)
      await expect(card).toHaveAccessibleName(
        await card.locator(".title").innerText(),
      );
  });
}

// The sticky On this page sidebar outgrew a 900 px window, and a sticky element taller than the window never
// scrolls into view, so its last entries were cut off. It keeps to the window and scrolls on its own.
test.describe("On this page sidebar in a short window", () => {
  test.use({ viewport: { width: 1280, height: 600 } });

  for (const route of POST_ROUTES)
    test(`${route} keeps every entry reachable`, async ({ page }) => {
      await page.goto(route);
      const nav = page.getByRole("navigation", { name: "On this page" });
      const links = nav.getByRole("link");
      test.skip(
        (await page.locator(".prose :is(h2, h3)").count()) === 0,
        "the post has no headings",
      );
      await page.mouse.wheel(0, 400);
      const last = links.last();
      await last.scrollIntoViewIfNeeded();
      // WebKit rounds the box to a fraction of a pixel short of the edge.
      await expect(last).toBeInViewport({ ratio: 0.99 });
    });
});

// The sidebar follows the reading: once the reading moves to another topic, only that topic is open; a toggle peeks
// into any topic until then; a clicked point leaves only its topic open and is current, also near the end of the page.
// The owner found a rule where a toggled topic stayed open and a scrolled one closed inconsistent while clicking
// around. Without JavaScript every topic is open.
test.describe("On this page sidebar topics", () => {
  test.use({ viewport: { width: 1280, height: 900 } });
  const topics = (page: Page) =>
    page.getByRole("navigation", { name: "On this page" }).locator("details");
  const scrollToHeading = (page: Page, selector: string) =>
    page
      .locator(selector)
      .first()
      .evaluate((el) => el.scrollIntoView({ block: "start" }));
  const readTopic = (page: Page, index: number) =>
    page
      .locator(".prose h2")
      .nth(index)
      .evaluate((el) => el.scrollIntoView({ block: "start" }));
  const openTopics = (page: Page) =>
    topics(page).evaluateAll((els) =>
      els.flatMap((el, i) =>
        el instanceof HTMLDetailsElement && el.open ? [i] : [],
      ),
    );
  const pointHref = async (page: Page, topic: number, point: number) => {
    const href = await topics(page)
      .nth(topic)
      .locator("a")
      .nth(point)
      .getAttribute("href");
    assert(href !== null);
    return href;
  };

  for (const route of POST_ROUTES) {
    test(`${route} keeps a peeked topic open within the topic and resets when the reading moves`, async ({
      page,
    }) => {
      await page.goto(route);
      const count = await topics(page).count();
      test.skip(count < 3, "the post has fewer than three topics");
      await expect.poll(() => openTopics(page)).toEqual([0]);

      await topics(page).nth(2).locator("summary").click();
      await expect.poll(() => openTopics(page)).toEqual([0, 2]);
      await scrollToHeading(page, await pointHref(page, 0, 1));
      await expect.poll(() => openTopics(page)).toEqual([0, 2]);

      await readTopic(page, 1);
      await expect.poll(() => openTopics(page)).toEqual([1]);
    });

    test(`${route} opens only the topic of a clicked point and marks the point current`, async ({
      page,
    }) => {
      await page.goto(route);
      const count = await topics(page).count();
      test.skip(count < 3, "the post has fewer than three topics");
      await topics(page).nth(1).locator("summary").click();
      await topics(page).nth(2).locator("summary").click();
      await expect.poll(() => openTopics(page)).toEqual([0, 1, 2]);

      // The second point of the last topic sits near the end of the page, where its heading cannot reach the top.
      // Counted as elements: while the topic still slides open, its links are not yet in the accessibility tree.
      const points = topics(page).last().locator("a");
      const point = points.nth(Math.min(1, (await points.count()) - 1));
      await point.click();
      await expect.poll(() => openTopics(page)).toEqual([count - 1]);
      await expect(point).toHaveAttribute("aria-current", "true");
      await page.waitForTimeout(500);
      await expect(point).toHaveAttribute("aria-current", "true");
    });

    test(`${route} keeps the topic being read closed after its toggle until the reading moves`, async ({
      page,
    }) => {
      await page.goto(route);
      const count = await topics(page).count();
      test.skip(count < 2, "the post has fewer than two topics");
      await expect.poll(() => openTopics(page)).toEqual([0]);
      await topics(page).nth(0).locator("summary").press("Enter");
      await expect.poll(() => openTopics(page)).toEqual([]);
      await scrollToHeading(page, await pointHref(page, 0, 1));
      await expect.poll(() => openTopics(page)).toEqual([]);

      await readTopic(page, 1);
      await expect.poll(() => openTopics(page)).toEqual([1]);
      await readTopic(page, 0);
      await expect.poll(() => openTopics(page)).toEqual([0]);
    });
  }

  for (const route of POST_ROUTES)
    test(`${route} marks the last point current at the end of the page`, async ({
      page,
    }) => {
      await page.goto(route);
      test.skip((await topics(page).count()) === 0, "the post has no topics");
      await page.evaluate(() =>
        scrollTo({ top: document.documentElement.scrollHeight }),
      );
      await expect(
        page
          .getByRole("navigation", { name: "On this page" })
          .getByRole("link")
          .last(),
      ).toHaveAttribute("aria-current", "true");
    });

  test.describe("without JavaScript", () => {
    test.use({ javaScriptEnabled: false });

    for (const route of POST_ROUTES)
      test(`${route} shows every topic open`, async ({ page }) => {
        await page.goto(route);
        const count = await topics(page).count();
        test.skip(count === 0, "the post has no topics");
        expect(await openTopics(page)).toEqual(
          Array.from({ length: count }, (_, i) => i),
        );
      });
  });
});

// Focus rings show only on :focus-visible, so a mouse click draws none
// (https://developer.mozilla.org/en-US/docs/Web/CSS/:focus-visible).
test("a mouse click on a category link draws no focus outline", async ({
  page,
}) => {
  await page.goto("/blog/");
  const filter = page
    .getByRole("navigation", { name: "Blog categories" })
    .getByRole("link", { name: "AI" });
  await filter.evaluate((el) =>
    el.addEventListener("click", (event) => event.preventDefault()),
  );
  await filter.click();
  expect(await filter.evaluate((el) => getComputedStyle(el).outlineStyle)).toBe(
    "none",
  );
});

// WCAG 1.4.1: the current category is marked by an underline, not by colour alone.
test("the current blog category is underlined", async ({ page }) => {
  await page.goto("/blog/");
  const current = page
    .getByRole("navigation", { name: "Blog categories" })
    .getByRole("link", { name: "All" });
  await expect(current).toHaveAttribute("aria-current", "page");
  const decoration = await current.evaluate((el) => {
    const style = getComputedStyle(el);
    return {
      line: style.textDecorationLine,
      color: style.textDecorationColor,
      text: style.color,
    };
  });
  expect(decoration.line).toBe("underline");
  expect(decoration.color).toBe(decoration.text);
});
