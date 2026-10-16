import { describe, it, expect } from "vitest";
import { getCategoryPath, getPostPath } from "./permalink";

describe("blog post permalinks", () => {
  it("builds the canonical path from the slug with a trailing slash", () => {
    expect(getPostPath({ id: "ai-agent-harness" })).toBe(
      "/blog/ai-agent-harness/",
    );
  });

  it("builds each category page path in lowercase with a trailing slash", () => {
    expect(getCategoryPath("AI")).toBe("/blog/category/ai/");
    expect(getCategoryPath("Architecture")).toBe(
      "/blog/category/architecture/",
    );
  });
});
