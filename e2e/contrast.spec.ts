import assert from "node:assert/strict";
import { animationsSettled } from "./animations";
import { test, expect, type Locator, type Page } from "@playwright/test";

// WCAG 2.2 SC 1.4.11: icons and the marks that identify a control need 3:1 against adjacent colours.
// Relative luminance and contrast ratio as defined in the WCAG 2.2 glossary (https://www.w3.org/TR/WCAG22/).
const luminance = (rgb: string) => {
  const channels = rgb.match(/[\d.]+/g);
  assert(channels !== null, `not an rgb() colour: ${rgb}`);
  const [r, g, b] = channels.slice(0, 3).map((value) => {
    const c = Number(value) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a: string, b: string) => {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
};

const css = (locator: Locator, property: "fill" | "backgroundColor") =>
  locator.evaluate((el, prop) => getComputedStyle(el)[prop], property);

for (const [theme, icon] of [
  ["light", "moon"],
  ["dark", "sun"],
]) {
  test.describe(`${theme} theme`, () => {
    test.beforeEach(async ({ page }) => {
      await page.addInitScript(
        (value) => localStorage.setItem("theme", value),
        theme,
      );
      await page.goto("/");
    });

    test(`the theme toggle shows the ${icon} with 3:1 against the header`, async ({
      page,
    }) => {
      const shown = page.locator(".theme-toggle svg").filter({ visible: true });
      await expect(shown).toHaveClass(new RegExp(`\\b${icon}\\b`));
      const fill = await css(shown, "fill");
      expect(
        contrast(
          fill,
          await css(page.locator(".header-wrapper header"), "backgroundColor"),
        ),
      ).toBeGreaterThanOrEqual(3);
    });

    test("the open menu close button has 3:1 against the overlay", async ({
      page,
    }) => {
      await page.getByRole("button", { name: "Open menu" }).click();
      await expect(
        page.getByRole("button", { name: "Close menu" }),
      ).toBeVisible();
      // The bars transition their colour on open; a mid-transition read could pass falsely.
      await animationsSettled(page);
      const bar = await css(
        page
          .getByRole("button", { name: "Close menu" })
          .locator("span")
          .first(),
        "backgroundColor",
      );
      expect(
        contrast(
          bar,
          await css(page.locator(".navigator-menu-overlay"), "backgroundColor"),
        ),
      ).toBeGreaterThanOrEqual(3);
    });

    // the focus ring is at least 2px and 3:1 against the page it sits on
    // (WCAG 2.2 SC 2.4.13, https://www.w3.org/WAI/WCAG22/Understanding/focus-appearance.html).
    test("keyboard focus on a button, a link and the theme toggle draws a 2px ring with 3:1 against the page", async ({
      page,
    }) => {
      const background = await css(page.locator("body"), "backgroundColor");
      const header = page.locator(".header-wrapper header");
      for (const control of [
        header.getByRole("button").first(),
        header.getByRole("link"),
        page.locator(".theme-toggle"),
      ]) {
        await page.keyboard.press("Tab");
        await expect(control).toBeFocused();
        const ring = await control.evaluate((el) => {
          const style = getComputedStyle(el);
          return {
            visible: el.matches(":focus-visible"),
            width: parseFloat(style.outlineWidth),
            color: style.outlineColor,
          };
        });
        expect(ring.visible).toBe(true);
        expect(ring.width).toBeGreaterThanOrEqual(2);
        expect(contrast(ring.color, background)).toBeGreaterThanOrEqual(3);
      }
    });
  });
}

// a card sits on its own surface. The blog cards are the home Card, so they
// share its surface: lighter than the page in both themes.
for (const theme of ["dark", "light"]) {
  test(`blog cards in the ${theme} theme sit on the home card surface, lighter than the page`, async ({
    page,
  }) => {
    await page.addInitScript(
      (value) => localStorage.setItem("theme", value),
      theme,
    );
    await page.goto("/");
    const home = await css(
      page.locator("#services .card").first(),
      "backgroundColor",
    );
    await page.goto("/blog/");
    const card = await css(
      page.locator(".blog-post-thumbnail").first(),
      "backgroundColor",
    );
    expect(card).toBe(home);
    expect(luminance(card)).toBeGreaterThan(
      luminance(await css(page.locator("body"), "backgroundColor")),
    );
  });
}

// axe cannot compute contrast for text painted by a gradient (background-clip: text) and reports it as
// incomplete. WCAG 2.2 SC 1.4.3 takes the gradient's lowest-contrast point
// (https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html), so each gradient is sampled between its stops and
// the worst sample is held against the background behind the text. Legacy rgb()/hsl() stops interpolate in sRGB
// (https://www.w3.org/TR/css-color-4/#interpolation-legacy). The name's drifting middle stop stays on the line between
// --accent-a and --accent-b, so the samples cover every frame.
interface GradientText {
  name: string;
  stops: string[];
  background: string;
  large: boolean;
}

// Every element painted with background-clip: text, found in the page rather than from a list.
const gradientTexts = (page: Page) =>
  page.evaluate(() =>
    [...document.querySelectorAll("body *")].flatMap((el): GradientText[] => {
      const style = getComputedStyle(el);
      if (!style.backgroundClip.includes("text")) return [];
      let parent = el.parentElement;
      while (
        parent !== null &&
        getComputedStyle(parent).backgroundColor === "rgba(0, 0, 0, 0)"
      )
        parent = parent.parentElement;
      const size = parseFloat(style.fontSize);
      const stops = style.backgroundImage.match(/rgba?\([^)]*\)/g);
      const text = el instanceof HTMLElement ? el.innerText.trim() : "";
      return [
        {
          name: `${el.tagName.toLowerCase()}.${[...el.classList].join(".")} "${text}"`,
          stops: stops === null ? [] : [...stops],
          background: getComputedStyle(parent === null ? document.body : parent)
            .backgroundColor,
          // Large text: at least 24px, or at least 18.66px bold (WCAG 2.2 glossary, large scale).
          large:
            size >= 24 || (size >= 18.66 && Number(style.fontWeight) >= 700),
        },
      ];
    }),
  );

const channels = (rgb: string) => {
  const values = rgb.match(/[\d.]+/g);
  assert(values !== null, `not an rgb() colour: ${rgb}`);
  return values.slice(0, 3).map(Number);
};
// Ten samples between each pair of neighbouring stops, mixed per channel.
const samples = (stops: string[]) =>
  stops.slice(1).flatMap((stop, i) => {
    const [from, to] = [channels(stops[i]), channels(stop)];
    return Array.from(
      { length: 11 },
      (_, step) =>
        `rgb(${from.map((c, k) => c + ((to[k] - c) * step) / 10).join(", ")})`,
    );
  });
// The elements whose worst sampled colour misses its threshold, named so a failure points at them.
const gradientFailures = (texts: GradientText[]) =>
  texts.flatMap(({ name, stops, background, large }) => {
    const worst = Math.min(
      ...samples(stops).map((colour) => contrast(colour, background)),
    );
    return worst < (large ? 3 : 4.5) ? [`${name}: ${worst.toFixed(2)}:1`] : [];
  });

test("the gradient text check names an element whose gradient is too light", async ({
  page,
}) => {
  // Injected, not a built route: a page under src/pages/ would ship.
  await page.setContent(
    '<body style="background: rgb(255, 255, 255)"><p class="faint" style="background-image: linear-gradient(90deg, rgb(0, 0, 0), rgb(220, 220, 220)); background-clip: text; color: transparent">Faint</p></body>',
  );
  const texts = await gradientTexts(page);
  expect(texts).toHaveLength(1);
  expect(gradientFailures(texts)).toEqual([
    expect.stringContaining('p.faint "Faint"'),
  ]);
});

for (const theme of ["light", "dark"]) {
  test.describe(`gradient text in the ${theme} theme`, () => {
    test.use({ reducedMotion: "reduce" });

    for (const route of ["/", "/cv/"]) {
      test(`every gradient text on ${route} keeps its contrast at the gradient's worst point`, async ({
        page,
      }) => {
        await page.addInitScript(
          (value) => localStorage.setItem("theme", value),
          theme,
        );
        await page.goto(route);
        const texts = await gradientTexts(page);
        expect(texts.length).toBeGreaterThan(0);
        expect(gradientFailures(texts)).toEqual([]);
      });
    }
  });
}
