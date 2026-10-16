import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { JSDOM } from "jsdom";
import { describe, it, expect, assert } from "vitest";
import { createTestPost } from "../../tests/fixtures/post";
import BlogPostLayout from "./BlogPostLayout.astro";

const SITE_URL = "https://www.pa-tech.dev";

const render = async (
  post = createTestPost({ id: "hello", publishDate: "2026-03-04" }),
) => {
  const container = await AstroContainer.create({
    astroConfig: { site: SITE_URL },
  });
  const html = await container.renderToString(BlogPostLayout, {
    props: { post },
    slots: { default: '<main id="page-main">Post body</main>' },
    request: new Request(`${SITE_URL}/blog/${post.id}/`),
  });
  return new JSDOM(html).window.document;
};

const meta = (doc: Document, key: string) => {
  const tag = doc.querySelector(`meta[property="${key}"], meta[name="${key}"]`);
  assert.exists(tag, `meta ${key}`);
  return tag.getAttribute("content");
};

const jsonLd = (doc: Document) => {
  const scripts = doc.querySelectorAll('script[type="application/ld+json"]');
  expect(scripts).toHaveLength(1);
  const script = scripts.item(0);
  assert.exists(script);
  return JSON.parse(script.textContent);
};

describe("BlogPostLayout (Astro)", () => {
  it("renders the post head as an article inside BaseLayout", async () => {
    const doc = await render();
    expect(doc.title).toBe("Title hello | Patrik Alexits");
    expect(meta(doc, "description")).toBe("Description hello");
    expect(meta(doc, "og:type")).toBe("article");
    expect(meta(doc, "article:published_time")).toBe(
      "2026-03-04T00:00:00.000Z",
    );
    expect(meta(doc, "og:image")).toBe(`${SITE_URL}/blog/hello/og.png`);
    expect(meta(doc, "og:image:alt")).toBe(
      "Title hello. Subtitle hello. Patrik Alexits | Frontend Architect",
    );
    const main = doc.getElementById("page-main");
    assert.exists(main);
    expect(main.textContent).toBe("Post body");
  });

  // https://developers.google.com/search/docs/appearance/structured-data/article
  it("describes the post as BlogPosting with its image, page and the CV page as author URL", async () => {
    expect(jsonLd(await render())).toEqual({
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: "Title hello",
      description: "Description hello",
      image: `${SITE_URL}/blog/hello/og.png`,
      datePublished: "2026-03-04T00:00:00.000Z",
      dateModified: "2026-03-04T00:00:00.000Z",
      mainEntityOfPage: `${SITE_URL}/blog/hello/`,
      author: {
        "@type": "Person",
        name: "Patrik Alexits",
        url: `${SITE_URL}/cv/`,
      },
    });
  });

  it("takes dateModified from updatedDate when the post has one", async () => {
    const doc = await render(
      createTestPost({
        id: "hello",
        publishDate: "2026-03-04",
        updatedDate: "2026-05-06",
      }),
    );
    expect(jsonLd(doc).dateModified).toBe("2026-05-06T00:00:00.000Z");
  });

  it("keeps a title with a closing script tag inside one JSON-LD block", async () => {
    const title = "</script><script>alert(1)</script>";
    const doc = await render(createTestPost({ id: "xss", title }));
    expect(jsonLd(doc).headline).toBe(title);
  });
});

// A post is indexable and names its canonical URL
// (https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls).
describe("BlogPostLayout indexing", () => {
  it("names the canonical URL and sets no robots meta", async () => {
    const real = await render();
    expect(real.querySelector('meta[name="robots"]')).toBeNull();
    expect(real.querySelector('link[rel="canonical"]')).toHaveProperty(
      "href",
      `${SITE_URL}/blog/hello/`,
    );
  });
});
