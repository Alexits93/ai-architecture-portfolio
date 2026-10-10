import type { BlogPost } from './types';

interface PostOverrides {
  id: string;
  title?: string;
  isFeatured?: boolean;
  publishDate?: string;
  tags?: string[];
}

/** Typed test fixture. Matches CollectionEntry<'blog'> exactly, no casts. */
export const createTestPost = ({
  id,
  title = `Title ${id}`,
  isFeatured = false,
  publishDate = '2026-01-01',
  tags = [],
}: PostOverrides): BlogPost => ({
  id,
  body: '',
  collection: 'blog',
  data: {
    slug: id,
    title,
    subtitle: `Subtitle ${id}`,
    description: `Description ${id}`,
    publishDate: new Date(publishDate),
    tags,
    isFeatured,
  },
});
