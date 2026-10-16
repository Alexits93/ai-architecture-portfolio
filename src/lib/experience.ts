// Build-time helpers for the experience collection (src/content.config.ts). Framework-free: they take the
// entry shape structurally, so lib imports nothing from Astro (ADR 002).

interface Period {
  start: number;
  end: number | null;
}

export interface TextPart {
  text: string;
  strong: boolean;
}

/** Collection order is not guaranteed (https://docs.astro.build/en/guides/content-collections/), so sort by start year. */
export const sortByStartDesc = <T extends { data: { start: number } }>(
  entries: readonly T[],
): T[] => [...entries].sort((a, b) => b.data.start - a.data.start);

export const formatPeriod = ({ start, end }: Period): string =>
  `${start} - ${end ?? "Present"}`;

/** Splits a highlight into plain and strong parts at each whole-word emphasis term, longest term first. */
export const splitEmphasis = (
  text: string,
  terms: readonly string[],
): TextPart[] => {
  if (terms.length === 0) return [{ text, strong: false }];
  const alternatives = [...terms]
    .sort((a, b) => b.length - a.length)
    .map((term) => RegExp.escape(term));
  const pattern = new RegExp(`(?<!\\w)(${alternatives.join("|")})(?!\\w)`);
  // split() with one capture group puts the matched terms at the odd indexes.
  return text
    .split(pattern)
    .map((part, index) => ({ text: part, strong: index % 2 === 1 }))
    .filter((part) => part.text !== "");
};
