import { glob } from 'astro/loaders';
import { z, defineCollection } from 'astro:content';

const blogCollection = defineCollection({
	loader: glob({ pattern: "**/*.md", base: "./src/content/blog" }),
	schema: z.object({
		title: z.string(),
		description: z.string(),
		publishDate: z.date(),
		tags: z.array(z.string()).default([]),
		isFeatured: z.boolean().default(false),
		isRecommended: z.boolean().default(false),
	}),
});

export const collections = {
	'blog': blogCollection,
};
