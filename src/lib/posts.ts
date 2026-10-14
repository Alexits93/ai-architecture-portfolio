import type { CollectionEntry } from 'astro:content';

export type BlogPost = CollectionEntry<'blog'>;
export type Category = BlogPost['data']['category'];

const byNewest = (a: BlogPost, b: BlogPost): number =>
  b.data.publishDate.getTime() - a.data.publishDate.getTime();

export const sortByNewest = (posts: readonly BlogPost[]): BlogPost[] => [...posts].sort(byNewest);

/** Explicitly featured post, otherwise the newest post. */
export const selectFeaturedPost = (posts: readonly BlogPost[]): BlogPost | undefined =>
  posts.find((post) => post.data.isFeatured) ?? sortByNewest(posts)[0];

interface RecommendedOptions {
  limit?: number;
  excludeId?: string;
}

/**
 * Legacy behavior: "recommended" = every post except the featured one.
 * Legacy shuffled randomly; we sort by date instead so static builds are reproducible.
 */
export const selectRecommendedPosts = (
  posts: readonly BlogPost[],
  { limit = 3, excludeId }: RecommendedOptions = {},
): BlogPost[] => {
  const featuredId = selectFeaturedPost(posts)?.id;
  return sortByNewest(posts)
    .filter((post) => post.id !== featuredId && post.id !== excludeId)
    .slice(0, limit);
};

/** The home writing list: the newest posts, at most `limit` (#219). */
export const selectLatestPosts = (posts: readonly BlogPost[], limit = 5): BlogPost[] =>
  sortByNewest(posts).slice(0, limit);
