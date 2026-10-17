import type { MarkdownHeading } from "astro";

export interface Topic {
  heading: MarkdownHeading;
  points: MarkdownHeading[];
}

/**
 * The outline of the On this page sidebar: each h2 with the deeper headings up to the next h2 as its points. A deeper
 * heading before the first h2 stands alone.
 */
export const groupHeadings = (
  headings: readonly MarkdownHeading[],
): Topic[] => {
  const topics: Topic[] = [];
  for (const heading of headings) {
    const last = topics.at(-1);
    if (heading.depth > 2 && last !== undefined && last.heading.depth === 2)
      last.points.push(heading);
    else topics.push({ heading, points: [] });
  }
  return topics;
};
