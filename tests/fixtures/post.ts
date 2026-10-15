import type { BlogPost, Category } from '@/lib/posts';

interface PostOverrides {
  id: string;
  title?: string;
  publishDate?: string;
  updatedDate?: string;
  category?: Category;
}

/** Typed test fixture. Matches CollectionEntry<'blog'> exactly, no casts. */
export const createTestPost = ({
  id,
  title = `Title ${id}`,
  publishDate = '2026-01-01',
  updatedDate,
  category = 'AI',
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
    ...(updatedDate === undefined ? {} : { updatedDate: new Date(updatedDate) }),
    category,
  },
});
