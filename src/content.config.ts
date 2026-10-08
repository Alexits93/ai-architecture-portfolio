import { glob } from 'astro/loaders';
import { z, defineCollection } from 'astro:content';

/**
 * Permalink slug contract: lowercase ASCII words joined by single hyphens.
 * The native glob() loader uses frontmatter `slug` as the entry `id`,
 * so the URL is decoupled from the filename and never derived implicitly.
 */
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const blogCollection = defineCollection({
	loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
	schema: z.object({
		slug: z.string().regex(SLUG_PATTERN, 'slug must be lowercase kebab-case (e.g. "web-components-overview")'),
		title: z.string(),
		subtitle: z.string(),
		description: z.string(),
		publishDate: z.coerce.date(),
		tags: z.array(z.string()).default([]),
		isFeatured: z.boolean().default(false),
	}),
});

export const collections = {
	blog: blogCollection,
};
