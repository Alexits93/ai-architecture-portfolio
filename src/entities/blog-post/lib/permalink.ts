import { ROUTES } from '@/shared/config';
import type { BlogPost } from '../model/types';

type PostRef = Pick<BlogPost, 'id'>;

/**
 * The only place a blog post URL is built. `post.id` is the frontmatter `slug`
 * (native glob() loader behavior), validated by the collection schema.
 */
export const getPostPath = (post: PostRef): string => `${ROUTES.blog}${post.id}/`;
