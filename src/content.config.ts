import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { defineCollection } from 'astro:content';

/**
 * Permalink slug contract: lowercase ASCII words joined by single hyphens.
 * The native glob() loader uses frontmatter `slug` as the entry `id`,
 * so the URL is decoupled from the filename and never derived implicitly.
 */
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** One category per post; each gets a static page at /blog/category/<lowercase name>/. */
export const CATEGORIES = ['AI', 'Architecture'] as const;

/** Strict object: an unknown frontmatter key, such as the removed `tags`, fails the build (Zod 4 z.strictObject). */
export const blogSchema = z.strictObject({
	slug: z.string().regex(SLUG_PATTERN, 'slug must be lowercase kebab-case (e.g. "web-components-overview")'),
	title: z.string(),
	subtitle: z.string(),
	description: z.string(),
	publishDate: z.coerce.date(),
	category: z.enum(CATEGORIES),
	isFeatured: z.boolean().default(false),
});

const blogCollection = defineCollection({
	loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
	schema: blogSchema,
});

export const collections = {
	blog: blogCollection,
};
