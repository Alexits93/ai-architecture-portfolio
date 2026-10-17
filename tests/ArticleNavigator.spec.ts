import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { JSDOM } from "jsdom";
import { describe, it, expect, beforeEach, assert } from "vitest";
import ArticleNavigator from "@/pages/blog/_ArticleNavigator.astro";

describe("ArticleNavigator - With Headings", () => {
  let container: AstroContainer;

  beforeEach(async () => {
    container = await AstroContainer.create();
  });

  // A topic with points is an open disclosure named by its heading, its points are links; a topic without points
  // is a link of its own.
  it("renders topics with points as open disclosures and the rest as links", async () => {
    const headings = [
      { depth: 2, slug: "intro", text: "Introduction" },
      { depth: 3, slug: "sub-intro", text: "Sub Introduction" },
      { depth: 2, slug: "conclusion", text: "Conclusion" },
    ];

    const html = await container.renderToString(ArticleNavigator, {
      props: { headings },
    });
    const doc = new JSDOM(html).window.document;

    const topic = doc.querySelector("nav.article-navigator details[open]");
    assert.exists(topic);
    expect(topic.getAttribute("data-slug")).toBe("intro");
    const summary = topic.querySelector("summary");
    assert.exists(summary);
    expect(summary.textContent.trim()).toBe("Introduction");

    const links = [...doc.querySelectorAll("nav.article-navigator a")].map(
      (link) => [
        link.getAttribute("href"),
        link.textContent.trim(),
        link.className.includes("h3-link") ? 3 : 2,
        link.closest("details") !== null,
      ],
    );
    expect(links).toEqual([
      ["#sub-intro", "Sub Introduction", 3, true],
      ["#conclusion", "Conclusion", 2, false],
    ]);
  });
});

describe("ArticleNavigator - Empty Headings", () => {
  let container: AstroContainer;

  beforeEach(async () => {
    container = await AstroContainer.create();
  });

  it("should render correctly with empty headings", async () => {
    const html = await container.renderToString(ArticleNavigator, {
      props: { headings: [] },
    });

    const dom = new JSDOM(html);
    const doc = dom.window.document;

    const navEl = doc.querySelector("nav.article-navigator");
    expect(navEl).not.toBeNull();

    const links = doc.querySelectorAll("nav.article-navigator a");
    expect(links.length).toBe(0);
  });
});
