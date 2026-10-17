import assert from "node:assert/strict";
import { globSync } from "node:fs";
import { test, expect } from "@playwright/test";

// One h1 on home, post h2 above body text, Inter from the Fonts API only.
const POST_ROUTE = `/${globSync("blog/*/index.html", { cwd: "dist" })[0].replace(/index\.html$/, "")}`;

test("home has exactly one h1", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("h1")).toHaveCount(1);
});

test("a post h2 is larger than its body text", async ({ page }) => {
  await page.goto(POST_ROUTE);
  test.skip(
    (await page.locator(".prose h2").count()) === 0,
    "no built post has an h2 yet",
  );
  const size = (selector: string) =>
    page
      .locator(selector)
      .first()
      .evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  expect(await size(".prose h2")).toBeGreaterThan(await size(".prose p"));
});

// The global reset sets margin 0 on p, li and h2, so the first post read as one wall of text on staging. Blocks of
// a post and list items keep a visible gap, and a heading sits closer to its own text, or to its topic heading,
// than to the section above.
const POST_ROUTES = globSync("blog/*/index.html", { cwd: "dist" }).map(
  (file) => `/${file.replace(/index\.html$/, "")}`,
);
for (const route of POST_ROUTES) {
  test(`blocks and list items in ${route} keep a gap to the one before`, async ({
    page,
  }) => {
    await page.goto(route);
    const gaps = await page.evaluate(() => {
      // The gap above each element after the first, and whether the element or the one before is a heading.
      const gapsOf = (els: Element[]) =>
        els.slice(1).map((el, i) => ({
          gap:
            el.getBoundingClientRect().top -
            els[i].getBoundingClientRect().bottom,
          heading: /^H[2-6]$/.test(el.tagName),
          afterHeading: /^H[2-6]$/.test(els[i].tagName),
        }));
      const prose = document.querySelector(".prose");
      if (prose === null) return null;
      return {
        blocks: gapsOf([...prose.children]),
        items: [...prose.querySelectorAll("ul, ol")].flatMap((list) =>
          gapsOf([...list.children]),
        ),
      };
    });
    assert(gaps !== null);
    expect(gaps.blocks.length).toBeGreaterThan(0);
    for (const { gap, heading, afterHeading } of gaps.blocks)
      expect(gap).toBeGreaterThanOrEqual(afterHeading ? 4 : heading ? 32 : 16);
    for (const { gap } of gaps.items) expect(gap).toBeGreaterThanOrEqual(8);
  });
}

test("Inter loads through the Fonts API, not @fontsource", async ({ page }) => {
  const fonts: string[] = [];
  page.on("request", (request) => {
    if (request.resourceType() === "font")
      fonts.push(new URL(request.url()).pathname);
  });
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
  expect(fonts.length).toBeGreaterThan(0);
  for (const font of fonts) expect(font).toMatch(/^\/_astro\/fonts\//);
  expect(await page.content()).not.toContain("fontsource");
});
