# Blog Post Page Implementation Plan (`devspec`)

## 1. Architecture (Feature-Sliced Design)

The Blog Post view strictly follows FSD boundaries. It is orchestrated by a single `BlogPostReader` widget, composed on the page layer.

- **Page (`src/pages/blog/[slug].astro`):**
  - Responsible for routing and SSR/SSG.
  - Implements `export async function getStaticPaths()` by fetching all entries via `getCollection('blog')`.
  - Resolves the `post` via props.
  - Renders the global layout (`<Layout>`) and configures the SEO head using `post.data`.
  - Delegates all internal layout and logic to the `<BlogPostReader post={post} />` widget.
  - Strictly no `<style>` blocks.

- **Widget (`src/widgets/blog-post-reader/ui/BlogPostReader.astro`):**
  - Takes a `CollectionEntry<'blog'>` as a prop.
  - Awaits `post.render()` to extract `<Content />` and `headings`.
  - Renders the top-level article metadata (Title, Subtitle, Author, Date).
  - Renders the responsive Hero image using Astro's `<Picture />` component.
  - Wraps `<Content />` in a styled `.prose` container for readability.
  - Iterates over `post.data.tags` to render `<SkillTag />` components.
  - Imports and positions the `<ArticleNavigator headings={headings} />`.
  - Imports and positions `<BlogPostRecommended />` at the bottom.
  - Scoped CSS will replicate the legacy grid layout (e.g., `grid-template-columns: 90% 10%` on large screens to position the sticky navigator).

- **Shared (`src/shared/ui`):**
  - `ArticleNavigator` handles the client-side active heading state natively.
  - `SkillTag` handles the visual display of tags.

## 2. Engineering Principles & Constraints

- **Static-First & Zero JS State:** No component state arrays or framework reactivity. The article is statically generated. Any client-side interaction (like the Article Navigator scroll tracking) is isolated within its existing vanilla custom element implementation.
- **Strict Typing:** The `post` prop in `BlogPostReader` must be strictly typed as `CollectionEntry<'blog'>`. Zero `any` or `unknown`.
- **FSD Enforcement:** The page layer imports the widget using the strict path alias `@/widgets/blog-post-reader`.

## 3. Security & Performance (09-Manifesto)

- **Security (XSS):** The Markdown content is parsed safely during Astro's build process via remark/rehype. No user-generated HTML is dangerously set on the client.
- **Performance (INP):** Interaction with the navigator relies purely on native scrolling APIs (`scrollIntoView` or `window.scrollTo`) and lightweight IntersectionObservers, ensuring no main-thread blockage.
- **Performance (CLS):** The hero image uses the `<Picture>` component with explicit `width` and `height` properties to reserve space before the image loads, preventing layout shifts.
- **Performance (LCP):** The hero image must be configured with `loading="eager"` and `fetchpriority="high"` since it will be the LCP element on the page.

## 4. Testing (TDD via Vitest)

- **Test Locations:**
  - `src/widgets/blog-post-reader/ui/BlogPostReader.spec.ts`: Utilize `experimental_AstroContainer` to mount the widget with a mock `CollectionEntry`. Assert that the title, metadata, tags, and content are structurally rendered, and that the `ArticleNavigator` receives the extracted headings.
  - Playwright E2E (`e2e/blog-post.spec.ts`): Verify that navigating to a specific `/blog/[slug]` route loads the page correctly and that clicking an Article Navigator link scrolls to the corresponding section.
