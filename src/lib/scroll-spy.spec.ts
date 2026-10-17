import { describe, it, expect } from "vitest";
import {
  currentHeading,
  initialSpyState,
  jumpTo,
  readTopic,
  settleJump,
  toggleTopic,
} from "./scroll-spy";

const open = (state: { open: ReadonlySet<number> }) =>
  [...state.open].toSorted();

describe("readTopic", () => {
  it("opens only the topic the reading moves to", () => {
    const peeked = toggleTopic(readTopic(initialSpyState, 0), 2);
    expect(open(peeked)).toEqual([0, 2]);
    expect(open(readTopic(peeked, 1))).toEqual([1]);
  });

  it("keeps a peeked topic open while the reading stays in its topic", () => {
    const peeked = toggleTopic(readTopic(initialSpyState, 0), 2);
    expect(readTopic(peeked, 0)).toBe(peeked);
  });

  it("keeps the topic being read closed after its toggle, until the reading moves", () => {
    const closed = toggleTopic(readTopic(initialSpyState, 0), 0);
    expect(open(readTopic(closed, 0))).toEqual([]);
    expect(open(readTopic(readTopic(closed, 1), 0))).toEqual([0]);
  });

  it("opens nothing for a heading outside any topic", () => {
    expect(open(readTopic(readTopic(initialSpyState, 0), null))).toEqual([]);
  });
});

describe("jumpTo", () => {
  it("leaves only the clicked topic open, also when it is the topic being read", () => {
    const peeked = toggleTopic(readTopic(initialSpyState, 1), 0);
    expect(open(peeked)).toEqual([0, 1]);
    expect(open(jumpTo(1))).toEqual([1]);
    expect(jumpTo(1).topic).toBe(1);
  });
});

describe("toggleTopic", () => {
  it("opens a closed topic and closes an open one", () => {
    const opened = toggleTopic(initialSpyState, 1);
    expect(open(opened)).toEqual([1]);
    expect(open(toggleTopic(opened, 1))).toEqual([]);
  });
});

describe("currentHeading", () => {
  it("is the last heading that reached the line, the first before any did", () => {
    expect(currentHeading([true, true, false], false)).toBe(1);
    expect(currentHeading([false, false, false], false)).toBe(0);
  });

  it("is the last heading at the end of the page", () => {
    expect(currentHeading([true, false, false], true)).toBe(2);
  });
});

describe("settleJump", () => {
  it("keeps a clicked heading in view current, also at the end of the page", () => {
    expect(settleJump(1, true, 2)).toBe(1);
  });

  it("follows the scroll when the clicked heading is out of view", () => {
    expect(settleJump(1, false, 2)).toBe(2);
  });
});
