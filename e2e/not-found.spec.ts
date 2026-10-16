import assert from "node:assert/strict";
import { test, expect } from "@playwright/test";

// An unknown path gets the site's own 404 page with a way back, not the host's generic page.
// the CV is the third way back.
test("an unknown path returns 404 with the site page and links home, to the blog and to the CV", async ({
  page,
}) => {
  const response = await page.goto("/does-not-exist/");
  assert(response !== null);
  expect(response.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Page not found",
  );
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    "noindex",
  );
  const main = page.locator("main");
  await expect(main.getByRole("link", { name: "Home" })).toHaveAttribute(
    "href",
    "/",
  );
  await expect(main.getByRole("link", { name: "Blog" })).toHaveAttribute(
    "href",
    "/blog/",
  );
  await expect(main.getByRole("link", { name: "CV" })).toHaveAttribute(
    "href",
    "/cv/",
  );
  await expect(page.locator("main")).not.toContainText("does-not-exist");
});

// The 404 page takes the home design system: an eyebrow over a display h1, the ways back as pills.
test("the 404 page shows an eyebrow, a display h1 and the ways back as pills", async ({
  page,
}) => {
  await page.goto("/does-not-exist/");
  await expect(page.locator("main .eyebrow")).toHaveText("/ 404");
  await expect(page.locator('main h1.display[data-size="section"]')).toHaveText(
    "Page not found",
  );
  await expect(page.locator("main a.pill")).toHaveText(["Home", "Blog", "CV"]);
});
