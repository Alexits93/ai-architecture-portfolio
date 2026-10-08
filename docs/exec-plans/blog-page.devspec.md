# Blog Page Implementation Plan (`devspec`)

## 1. Architecture (Feature-Sliced Design)

The Blog page follows FSD strict boundaries. It relies on a single complex composition encapsulated in a Widget.

- **Page (`src/pages/blog/index.astro`):**
  - Pure composition layer. Sets up the SEO head and page layout, importing the `BlogFeed` widget.
  - Adheres strictly to the rule: "Pages must not contain `<style>` blocks."

- **Widget (`src/widgets/blog-feed/ui/BlogFeed.astro`):**
  - The primary orchestration layer.
  - Fetches blog posts via `getCollection('blog')` and applies `selectStandardPosts`.
  - Extracts unique tags from these posts.
  - Renders `<h1>Blog</h1>`, `<BlogPostFilter />`, and the responsive grid of `<BlogPostThumbnail />` components.
  - Uses a scoped `<style>` block for the grid layout (`.wrapper`), defining 1-col (mobile), 2-col (tablet), and 3-col (desktop) rules.
  - Wraps the content in a custom web component (e.g., `<blog-feed-interactive>`) to encapsulate vanilla JS filtering logic.

- **Feature (`src/features/blog-post-filter/ui/BlogPostFilter.astro`):**
  - Already exists. Provides the `<form id="filter-form">` with checkboxes.
  - We will leverage its native HTML form state.

- **Entity (`src/entities/blog-post`):**
  - Use `ui/BlogPostThumbnail.astro` (Already exists).
  - Add a new selector to `src/entities/blog-post/model/selectors.ts`: `selectStandardPosts(posts: readonly BlogPost[])` which returns posts sorted by newest, filtering out `post.data.isFeatured === true`.

## 2. Engineering Principles & HTML5 State Law

To strictly adhere to the **HTML5 State Law**:
- We will NOT track `selectedTags: string[]` in a JS variable or Nano Store.
- The state lives entirely in the DOM via the `<input type="checkbox" name="tag">` elements rendered by `BlogPostFilter`.
- In `BlogFeed.astro`, a `<script>` will define a custom element `<blog-feed-interactive>`. This script will:
  1. Listen for `change` events on the `<form>`.
  2. Dynamically read the DOM: `const formData = new FormData(form); const activeTags = formData.getAll('tag');`
  3. Iterate over the post cards (which will have a `data-tags` attribute) and toggle a `hidden` attribute or class based on whether they match the `activeTags`.

## 3. Security & Performance (09-Manifesto)

- **Security (XSS):** No dynamic HTML rendering (`set:html`) is used. Data from content collections is injected safely by Astro's default HTML escaping.
- **Performance (INP):** Zero framework JS is shipped. The filter interaction relies on lightweight, synchronous vanilla JS DOM updates. No VDOM reconciliation overhead.
- **Performance (CLS):** The grid defines explicit `grid-template-columns` and gap sizing. Thumbnails rely on Astro's native asset optimization with explicit aspect ratios to avoid layout shifts.
- **Performance (LCP):** LCP will be the first `BlogPostThumbnail` image. The `BlogFeed` widget will pass `loading="eager"` (or an explicit preload directive) to the first image to prioritize it.

## 4. Testing (TDD via Vitest)

- **Strict Typing:** Zero `any` or `unknown`.
- **Test Locations:**
  - `src/entities/blog-post/model/selectors.spec.ts`: Add tests for `selectStandardPosts`.
  - `src/widgets/blog-feed/ui/BlogFeed.spec.ts`: Unit/Integration test using `experimental_AstroContainer` to ensure standard posts are passed correctly, tags are uniquely extracted, and the DOM structure is correct.
  - `tests/pages/blog.spec.ts`: A Vitest Native Browser Mode test (or an E2E test) to physically click the checkboxes and verify that non-matching posts become hidden.
