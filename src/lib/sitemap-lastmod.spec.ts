import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it, expect, afterEach } from 'vitest';
import { lastmodFor, readPostDates } from './sitemap-lastmod';

const post = (fields: string) => `---\n${fields}\n---\n\nslug: body-text\n`;

let dir = '';
const writePosts = (files: Record<string, string>) => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sitemap-lastmod-'));
  for (const [name, source] of Object.entries(files)) fs.writeFileSync(path.join(dir, name), source);
  return dir;
};

afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

describe('readPostDates', () => {
  it('reads the slug, the category and the last change of each post from its frontmatter', () => {
    const posts = readPostDates(
      writePosts({
        'a.md': post('slug: a-post\ntitle: "A"\npublishDate: 2026-10-06\ncategory: AI'),
        'b.md': post('slug: "b-post"\npublishDate: 2026-10-07\nupdatedDate: \'2026-10-09\'\ncategory: Architecture\ndraft: true'),
        'notes.txt': 'not a post',
      }),
    );
    // #354: the sitemap leaves out a draft, so the reader reports it; a post without the flag is not a draft.
    expect(posts.toSorted((x, y) => x.id.localeCompare(y.id))).toEqual([
      { id: 'a-post', category: 'AI', modified: new Date('2026-10-06'), draft: false },
      { id: 'b-post', category: 'Architecture', modified: new Date('2026-10-09'), draft: true },
    ]);
  });

  it('fails on a post without frontmatter or without a required field', () => {
    expect(() => readPostDates(writePosts({ 'a.md': 'no frontmatter' }))).toThrow('a.md: no frontmatter');
    fs.rmSync(dir, { recursive: true, force: true });
    expect(() => readPostDates(writePosts({ 'a.md': post('slug: a-post\ncategory: AI') }))).toThrow(
      'a.md: no publishDate',
    );
  });
});

describe('lastmodFor', () => {
  const posts = [
    { id: 'old', category: 'AI', modified: new Date('2026-10-06'), draft: false },
    { id: 'new', category: 'Architecture', modified: new Date('2026-10-09'), draft: false },
  ];
  const pages = { '/privacy-policy/': new Date('2026-10-14') };

  it('dates a post by its last change', () => {
    expect(lastmodFor('/blog/old/', posts, pages)).toEqual(new Date('2026-10-06'));
  });

  it('dates every blog index page by its newest post', () => {
    expect(lastmodFor('/blog/', posts, pages)).toEqual(new Date('2026-10-09'));
    expect(lastmodFor('/blog/2/', posts, pages)).toEqual(new Date('2026-10-09'));
  });

  it('dates every category page by the newest post in the category', () => {
    expect(lastmodFor('/blog/category/ai/', posts, pages)).toEqual(new Date('2026-10-06'));
    expect(lastmodFor('/blog/category/ai/2/', posts, pages)).toEqual(new Date('2026-10-06'));
  });

  it('dates a fixed page by its given date and leaves the rest undated', () => {
    expect(lastmodFor('/privacy-policy/', posts, pages)).toEqual(new Date('2026-10-14'));
    expect(lastmodFor('/', posts, pages)).toBeUndefined();
    expect(lastmodFor('/blog/category/design/', posts, pages)).toBeUndefined();
  });
});
