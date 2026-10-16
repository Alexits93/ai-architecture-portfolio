import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { JSDOM } from "jsdom";
import { describe, it, expect, assert } from "vitest";
import { Content } from "./fixtures/code-fence.md";

// No published post has a code fence, so this fixture runs one through the real markdown config.
// The hash-based CSP blocks inline style attributes, so highlighting must be class-only (Prism, not Shiki).
describe("Markdown code fences under the hash-based CSP", () => {
  it("renders Prism token classes and no inline style attributes", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(Content);
    const doc = new JSDOM(html).window.document;

    expect(doc.querySelectorAll("[style]")).toHaveLength(0);
    expect(
      doc.querySelector("pre.language-ts code.language-ts"),
    ).not.toBeNull();
    const el = doc.querySelector(".token.keyword");
    assert.exists(el);
    expect(el.textContent).toBe("const");
  });
});
