import { describe, it, expect, vi, beforeEach } from "vitest";
import { createTestPost } from "./fixtures/post";
import { GET, getStaticPaths } from "@/pages/blog/[slug]/og.png";
import * as ogModule from "@/lib/og-image";

const post = createTestPost({ id: "hello" });

vi.mock("astro:content", () => ({ getCollection: async () => [post] }));

// Each post shares its own image, drawn with its title and subtitle.
describe("post og.png endpoint", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("builds one image per post at the post path", async () => {
    expect(await getStaticPaths()).toEqual([
      { params: { slug: "hello" }, props: { post } },
    ]);
  });

  it("draws the post title and subtitle into a PNG response", async () => {
    const png = Buffer.from("89504e470d0a1a0a", "hex");
    const spy = vi.spyOn(ogModule, "generateOgImage").mockResolvedValue(png);

    const response = await GET({ props: { post } });

    expect(spy).toHaveBeenCalledExactlyOnceWith(
      "Title hello",
      "Subtitle hello",
    );
    expect(response.status).toBe(200);
    expect(Buffer.from(await response.arrayBuffer())).toEqual(png);
  });
});
