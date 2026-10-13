import { ROUTES } from '@/consts';
import type { BlogPost, Category } from './posts';

type PostRef = Pick<BlogPost, 'id'>;

/**
 * The only place a blog post URL is built. `post.id` is the frontmatter `slug`
 * (native glob() loader behavior), validated by the collection schema.
 */
export const getPostPath = (post: PostRef): string => `${ROUTES.blog}${post.id}/`;

/** The only place a category page URL is built; the segment is the `[category]` param of its route. */
export const getCategoryPath = (category: Category): string => `${ROUTES.blog}category/${category.toLowerCase()}/`;
