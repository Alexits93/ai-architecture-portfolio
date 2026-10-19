import { globSync } from "node:fs";
import { test, expect, type Page } from "@playwright/test";

// BaseLayout renders the footer once on every built page.
const ROUTES = globSync("**/*.html", { cwd: "dist" }).map(
  (file) => `/${file.replace(/index\.html$/, "")}`,
);

test("finds the built pages", () => expect(ROUTES.length).toBeGreaterThan(5));

for (const route of ROUTES) {
  test(`one footer after main on ${route}`, async ({ page }) => {
    await page.goto(route);
    await expect(page.locator("footer")).toHaveCount(1);
    await expect(page.getByRole("contentinfo")).toBeVisible();
    await expect(page.locator("main + footer")).toHaveCount(1);
    await expect(
      page
        .getByRole("contentinfo")
        .getByRole("link", { name: "Privacy policy" }),
    ).toHaveAttribute("href", "/privacy-policy/");
    await expect(
      page
        .getByRole("contentinfo")
        .getByRole("link", { name: "How this site is built" }),
    ).toHaveAttribute("href", "/how-this-site-is-built/");
  });
}

test("the footer link reaches how this site is built", async ({ page }) => {
  await page.goto("/");
  await page
    .getByRole("contentinfo")
    .getByRole("link", { name: "How this site is built" })
    .click();
  await expect(page).toHaveURL("/how-this-site-is-built/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
});

// compressHTML removes the whitespace between the footer links, so the gap has to come from CSS.
const linkGap = async (page: Page) => {
  const footer = page.getByRole("contentinfo");
  const built = await footer
    .getByRole("link", { name: "How this site is built" })
    .boundingBox();
  const privacy = await footer
    .getByRole("link", { name: "Privacy policy" })
    .boundingBox();
  if (!built || !privacy) throw new Error("footer links are not rendered");
  const horizontal = Math.max(
    privacy.x - (built.x + built.width),
    built.x - (privacy.x + privacy.width),
  );
  const vertical = Math.max(
    privacy.y - (built.y + built.height),
    built.y - (privacy.y + privacy.height),
  );
  return Math.max(horizontal, vertical);
};

// test.use sets the viewport before the page opens (https://playwright.dev/docs/emulation#viewport);
// page.setViewportSize hangs headed Firefox on KDE Wayland.
for (const width of [1280, 320]) {
  test.describe(`Footer at ${width}px`, () => {
    test.use({ viewport: { width, height: 800 } });

    test(`policy links do not touch at ${width}px`, async ({ page }) => {
      await page.goto("/");
      expect(await linkGap(page)).toBeGreaterThanOrEqual(8);
    });
  });
}
