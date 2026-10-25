import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { JSDOM } from "jsdom";
import { describe, it, expect, beforeEach, assert } from "vitest";
import { createTestPost } from "../../tests/fixtures/post";
import BlogPostThumbnail from "./BlogPostThumbnail.astro";

const mockPost = createTestPost({ id: "test-post", category: "Architecture" });

describe("BlogPostThumbnail Entity (Astro)", () => {
  let container: AstroContainer;

  beforeEach(async () => {
    container = await AstroContainer.create();
  });

  const render = async (heading: "h2" | "h3" = "h2") => {
    const html = await container.renderToString(BlogPostThumbnail, {
      props: { post: mockPost, heading },
    });
    return new JSDOM(html).window.document;
  };

  it("renders title, description, and a slug permalink with trailing slash", async () => {
    const doc = await render();
    const [title, description, link] = [
      doc.querySelector("h2"),
      doc.querySelector("p:not(.eyebrow)"),
      doc.querySelector("a"),
    ];
    assert.exists(title);
    assert.exists(description);
    assert.exists(link);
    expect(title.textContent).toBe("Title test-post");
    expect(description.textContent).toBe("Description test-post");
    expect(link.getAttribute("href")).toBe("/blog/test-post/");
  });

  // The home design system: a raised card with the category as its kicker and a display title. The morph
  // script finds the card link by data-post-card and names the title inside it.
  it("renders a raised card with the category kicker and a display title", async () => {
    const doc = await render();
    const card = doc.querySelector("article.card");
    assert.exists(card);
    const kicker = card.querySelector(".eyebrow");
    assert.exists(kicker);
    expect(kicker.textContent).toBe("Architecture");
    const title = card.querySelector(
      'h2.display[data-size="card"] a[data-post-card] [data-morph="title"]',
    );
    assert.exists(title);
  });

  // Under the "Recommended articles" h2, the card titles are h3 (WCAG 1.3.1).
  it("renders the title at the heading level it is given", async () => {
    const doc = await render("h3");
    expect(doc.querySelector("h2")).toBeNull();
    expect(doc.querySelector("h3")).toHaveProperty(
      "textContent",
      "Title test-post",
    );
  });

  // The title is the card's only link, so the category is text, not a second link.
  it("renders the category as text, and no arrow icon or image", async () => {
    const doc = await render();
    expect(doc.querySelectorAll("a")).toHaveLength(1);
    expect(doc.querySelector("svg, img, figure")).toBeNull();
  });
});

describe("BlogPostThumbnail link name", () => {
  // Regression: axe-core 4.14 reported label-content-name-mismatch (WCAG 2.5.3) on every card. The link wrapped the
  // whole card but was named by the title alone, so the category and the description were visible but not in its name.
  it("puts the link in the heading, named by its own text, the title", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(BlogPostThumbnail, {
      props: { post: mockPost, heading: "h2" },
    });
    const doc = new JSDOM(html).window.document;
    const link = doc.querySelector("h2 > a");
    assert.exists(link);
    expect(link.textContent).toBe("Title test-post");
    expect(link.hasAttribute("aria-labelledby")).toBe(false);
    expect(link.hasAttribute("aria-label")).toBe(false);
  });
});
