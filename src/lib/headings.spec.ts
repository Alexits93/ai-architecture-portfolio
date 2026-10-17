import { describe, it, expect } from "vitest";
import { groupHeadings } from "./headings";

const h = (depth: number, slug: string) => ({ depth, slug, text: slug });

describe("groupHeadings", () => {
  it("puts the deeper headings under the h2 before them", () => {
    expect(
      groupHeadings([
        h(2, "a"),
        h(3, "a1"),
        h(4, "a1x"),
        h(2, "b"),
        h(3, "b1"),
      ]),
    ).toEqual([
      { heading: h(2, "a"), points: [h(3, "a1"), h(4, "a1x")] },
      { heading: h(2, "b"), points: [h(3, "b1")] },
    ]);
  });

  it("keeps an h2 without points and a deeper heading before the first h2 on their own", () => {
    expect(groupHeadings([h(3, "lead"), h(2, "a"), h(2, "b")])).toEqual([
      { heading: h(3, "lead"), points: [] },
      { heading: h(2, "a"), points: [] },
      { heading: h(2, "b"), points: [] },
    ]);
  });

  it("returns no topics for no headings", () => {
    expect(groupHeadings([])).toEqual([]);
  });
});
