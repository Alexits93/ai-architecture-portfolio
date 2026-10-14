import { describe, it, expect, assert } from 'vitest';
import { selectFeaturedPost, selectLatestPosts, selectRecommendedPosts, sortByNewest } from './posts';
import { createTestPost } from '../../tests/fixtures/post';

const oldest = createTestPost({ id: 'oldest', publishDate: '2026-01-01' });
const middle = createTestPost({ id: 'middle', publishDate: '2026-02-01' });
const newest = createTestPost({ id: 'newest', publishDate: '2026-03-01' });
const featured = createTestPost({ id: 'featured', publishDate: '2025-01-01', isFeatured: true });

describe('sortByNewest', () => {
  it('orders by publishDate descending without mutating input', () => {
    const input = [oldest, newest, middle];
    expect(sortByNewest(input).map((p) => p.id)).toEqual(['newest', 'middle', 'oldest']);
    expect(input.map((p) => p.id)).toEqual(['oldest', 'newest', 'middle']);
  });
});

describe('selectFeaturedPost', () => {
  it('returns the explicitly featured post', () => {
    const post = selectFeaturedPost([oldest, featured, newest]);
    assert.exists(post);
    expect(post.id).toBe('featured');
  });

  it('falls back to the newest post when none is featured', () => {
    const post = selectFeaturedPost([oldest, newest, middle]);
    assert.exists(post);
    expect(post.id).toBe('newest');
  });

  it('returns undefined for an empty collection', () => {
    expect(selectFeaturedPost([])).toBeUndefined();
  });
});

describe('selectRecommendedPosts', () => {
  it('excludes the featured post and sorts newest first', () => {
    const ids = selectRecommendedPosts([featured, oldest, newest, middle]).map((p) => p.id);
    expect(ids).toEqual(['newest', 'middle', 'oldest']);
  });

  it('excludes the fallback featured post when none is flagged', () => {
    const ids = selectRecommendedPosts([oldest, newest, middle]).map((p) => p.id);
    expect(ids).toEqual(['middle', 'oldest']);
  });

  it('respects limit and excludeId', () => {
    const ids = selectRecommendedPosts([featured, oldest, newest, middle], { limit: 1, excludeId: 'newest' }).map(
      (p) => p.id,
    );
    expect(ids).toEqual(['middle']);
  });

  it('returns an empty list for an empty collection', () => {
    expect(selectRecommendedPosts([])).toEqual([]);
  });
});

describe('selectLatestPosts', () => {
  it('returns every post newest first when there are fewer than five', () => {
    expect(selectLatestPosts([oldest, newest, middle]).map((p) => p.id)).toEqual(['newest', 'middle', 'oldest']);
  });

  it('keeps the five newest of seven', () => {
    const seven = ['01', '02', '03', '04', '05', '06', '07'].map((day) =>
      createTestPost({ id: day, publishDate: `2026-01-${day}` }),
    );
    expect(selectLatestPosts(seven).map((p) => p.id)).toEqual(['07', '06', '05', '04', '03']);
  });
});
