import { file, glob } from "astro/loaders";
import { z } from "astro/zod";
import { defineCollection } from "astro:content";

/**
 * Permalink slug contract: lowercase ASCII words joined by single hyphens.
 * The native glob() loader uses frontmatter `slug` as the entry `id`,
 * so the URL is decoupled from the filename and never derived implicitly.
 */
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** One category per post; each gets a static page at /blog/category/<lowercase name>/. */
export const CATEGORIES = ["AI", "Architecture"] as const;

/** Strict object: an unknown frontmatter key, such as the removed `tags`, fails the build (Zod 4 z.strictObject). */
export const blogSchema = z.strictObject({
  slug: z
    .string()
    .regex(
      SLUG_PATTERN,
      'slug must be lowercase kebab-case (e.g. "web-components-overview")',
    ),
  title: z.string(),
  subtitle: z.string(),
  description: z.string(),
  publishDate: z.coerce.date(),
  /** The last substantial change, for dateModified and the sitemap lastmod. */
  updatedDate: z.coerce.date().optional(),
  category: z.enum(CATEGORIES),
  /** A test article for design and features, shown with a Draft label until the owner's posts replace it. */
  draft: z.boolean().default(false),
});

const blogCollection = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/blog" }),
  schema: blogSchema,
});

/**
 * One entry per position, newest first on /cv/ (sorted in src/lib/experience.ts, since collection order is not guaranteed).
 * `end: null` is the current position. Highlights are plain text; each `emphasis` term renders in <strong>
 * wherever a highlight contains it, so no entry needs HTML or set:html.
 */
export const experienceSchema = z
  .strictObject({
    id: z.string().regex(SLUG_PATTERN),
    start: z.int(),
    end: z.int().nullable(),
    role: z.string(),
    company: z.string(),
    highlights: z.array(z.string()).min(1),
    emphasis: z.array(z.string()),
    skills: z.array(z.string()),
  })
  .refine(
    (entry) =>
      entry.emphasis.every((term) =>
        entry.highlights.some((text) => text.includes(term)),
      ),
    {
      message: "every emphasis term must appear in a highlight",
      path: ["emphasis"],
    },
  );

const experienceCollection = defineCollection({
  loader: file("src/content/experience.yaml"),
  schema: experienceSchema,
});

/** The now block on home (https://nownownow.com/about): Markdown text plus the date it was last updated. */
export const nowSchema = z.strictObject({
  updated: z.coerce.date(),
});

const nowCollection = defineCollection({
  loader: glob({ pattern: "now.md", base: "./src/content/now" }),
  schema: nowSchema,
});

/** The principles list on home: an owner-written Markdown list, no frontmatter. */
const principlesCollection = defineCollection({
  loader: glob({ pattern: "principles.md", base: "./src/content/principles" }),
});

/** The "What I do best" cards on home, shown by `order` since collection order is not guaranteed. */
export const servicesSchema = z.strictObject({
  id: z.string().regex(SLUG_PATTERN),
  order: z.int().positive(),
  kicker: z.string(),
  title: z.string(),
  text: z.string(),
  tools: z.array(z.string()).min(1),
});

const servicesCollection = defineCollection({
  loader: file("src/content/services.yaml"),
  schema: servicesSchema,
});

/** The FAQ on home, shown by `order` since collection order is not guaranteed. Answers are plain text. */
export const faqSchema = z.strictObject({
  id: z.string().regex(SLUG_PATTERN),
  order: z.int().positive(),
  question: z.string(),
  answer: z.string(),
});

const faqCollection = defineCollection({
  loader: file("src/content/faq.yaml"),
  schema: faqSchema,
});

export const collections = {
  blog: blogCollection,
  experience: experienceCollection,
  faq: faqCollection,
  now: nowCollection,
  principles: principlesCollection,
  services: servicesCollection,
};
