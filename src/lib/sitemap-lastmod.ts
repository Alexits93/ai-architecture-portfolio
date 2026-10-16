import fs from "node:fs";
import path from "node:path";
import { modifiedDate } from "./posts";

export interface PostDates {
  id: string;
  category: string;
  modified: Date;
  /** A test article: noindex, so the sitemap leaves it out. */
  draft: boolean;
}

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---/;

const field = (frontmatter: string, key: string): string | undefined =>
  new RegExp(`^${key}:[ \\t]*["']?(.+?)["']?[ \\t]*$`, "m").exec(
    frontmatter,
  )?.[1];

/**
 * The sitemap is written by astro.config.mjs, where the content store does not exist, so this reads the dates from the
 * post frontmatter. The collection schema validates the same fields at build time.
 */
export const readPostDates = (dir: string): PostDates[] =>
  fs
    .readdirSync(dir)
    .filter((file) => file.endsWith(".md"))
    .map((file) => {
      const frontmatter = FRONTMATTER.exec(
        fs.readFileSync(path.join(dir, file), "utf-8"),
      )?.[1];
      if (frontmatter === undefined) throw new Error(`${file}: no frontmatter`);
      const required = (key: string): string => {
        const value = field(frontmatter, key);
        if (value === undefined)
          throw new Error(`${file}: no ${key} in the frontmatter`);
        return value;
      };
      const updated = field(frontmatter, "updatedDate");
      return {
        id: required("slug"),
        category: required("category"),
        modified: modifiedDate({
          publishDate: new Date(required("publishDate")),
          ...(updated === undefined ? {} : { updatedDate: new Date(updated) }),
        }),
        draft: field(frontmatter, "draft") === "true",
      };
    });

const newest = (posts: readonly PostDates[]): Date | undefined =>
  posts
    .map((post) => post.modified)
    .toSorted((a, b) => b.getTime() - a.getTime())[0];

/**
 * The sitemap lastmod of a page path: a post's last change, the newest post of a blog list (a new post shifts every
 * page of its list), or a date from `pages`. A page without an honest content date gets none.
 */
export const lastmodFor = (
  pathname: string,
  posts: readonly PostDates[],
  pages: Readonly<Record<string, Date>>,
): Date | undefined => {
  const post = posts.find((entry) => pathname === `/blog/${entry.id}/`);
  if (post !== undefined) return post.modified;
  if (/^\/blog\/(?:\d+\/)?$/.test(pathname)) return newest(posts);
  const category = /^\/blog\/category\/([^/]+)\/(?:\d+\/)?$/.exec(
    pathname,
  )?.[1];
  if (category !== undefined)
    return newest(
      posts.filter((entry) => entry.category.toLowerCase() === category),
    );
  return pages[pathname];
};
