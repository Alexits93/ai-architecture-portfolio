import type { CollectionEntry } from "astro:content";

export type BlogPost = CollectionEntry<"blog">;
export type Category = BlogPost["data"]["category"];

const byNewest = (a: BlogPost, b: BlogPost): number =>
  b.data.publishDate.getTime() - a.data.publishDate.getTime();

export const sortByNewest = (posts: readonly BlogPost[]): BlogPost[] =>
  [...posts].sort(byNewest);

interface RecommendedOptions {
  limit?: number;
  excludeId?: string;
}

/** The newest posts except `excludeId`, sorted by date so static builds are reproducible. */
export const selectRecommendedPosts = (
  posts: readonly BlogPost[],
  { limit = 3, excludeId }: RecommendedOptions = {},
): BlogPost[] =>
  sortByNewest(posts)
    .filter((post) => post.id !== excludeId)
    .slice(0, limit);

/** The home writing list: the newest posts, at most `limit`. */
export const selectLatestPosts = (
  posts: readonly BlogPost[],
  limit = 5,
): BlogPost[] => sortByNewest(posts).slice(0, limit);

/** The last change to a post: its `updatedDate`, else its `publishDate`. */
export const modifiedDate = ({
  publishDate,
  updatedDate,
}: {
  publishDate: Date;
  updatedDate?: Date;
}): Date => updatedDate ?? publishDate;
