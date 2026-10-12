# Architecture

Target structure: Astro's conventions (ADR 002), imports flow `pages > layouts > components > lib` (ESLint enforced). The tree still holds the legacy folders `src/widgets`, `src/entities` and `src/shared`, which Story #76 moves. The map shows today's imports between folders; update it when a page, layout or component is added or removed.

```mermaid
flowchart TD
    subgraph Pages["src/pages"]
        Index["index.astro"]
        CV["cv.astro"]
        BlogIndex["blog/[...page].astro"]
        BlogCategory["blog/category/[category]/[...page].astro"]
        BlogFeed["blog/_BlogFeed.astro"]
        BlogPost["blog/[slug].astro"]
        Cookie["cookie-disclaimer.astro"]
        Privacy["privacy-policy.astro"]
        OG["og.png.ts"]
    end

    subgraph Layouts["src/layouts"]
        Base["BaseLayout.astro"]
        PostLayout["BlogPostLayout.astro"]
    end

    subgraph Widgets["src/widgets"]
        Header["header"]
        Menu["navigator-menu"]
        Footer["footer"]
        AboutMe["about-me"]
        Experience["experience-list"]
        Featured["blog-post-featured"]
        Recommended["blog-post-recommended"]
        Reader["blog-post-reader"]
        CookieW["cookie-disclaimer"]
        PrivacyW["privacy-policy"]
    end

    Content["src/content.config.ts"]

    subgraph Entities["src/entities"]
        Post["blog-post"]
    end

    subgraph Shared["src/shared"]
        SkillTag["ui/skill-tag"]
        ArticleNav["ui/article-navigator"]
        SeoHead["ui/seo-head"]
        Store["stores/ui"]
        OgLib["lib/og"]
        Config["config"]
    end

    Index & CV & BlogIndex & BlogCategory & Cookie & Privacy --> Base
    BlogPost --> PostLayout
    PostLayout --> Base & Config
    Base --> Header & Menu & Footer & SeoHead
    Index --> AboutMe & Featured & Recommended & Config
    CV --> AboutMe & Experience
    BlogIndex & BlogCategory --> BlogFeed
    BlogIndex & BlogCategory --> Content & Post
    BlogFeed --> Post & Content & Config
    BlogPost --> Reader & Recommended
    Cookie --> CookieW
    Privacy --> PrivacyW
    OG --> OgLib

    Header --> Store
    Experience --> SkillTag
    Featured --> Post
    Recommended --> Post & Config
    Reader --> ArticleNav & SkillTag & Post
    Post --> SkillTag & Config
```

## State
- Theme: `astro.config.mjs` injects `src/lib/theme.js` as a hashed inline `<head>` script on every page, so it costs no request (#86). A native store over localStorage key `theme` in `src/shared/stores/ui`, without a state library; it re-renders on the `storage` event from other tabs and on a bfcache `pageshow`. Only the `Header` client script reads and writes it. `src/lib/theme.js` applies a stored `light` or `dark` before first paint. Without one, nothing sets `data-theme` and `prefers-color-scheme` decides; the toggle's `aria-pressed` then follows the OS theme.
- Card-to-post morph: `astro.config.mjs` also injects `src/lib/post-morph.js` as a hashed inline `<head>` script, because its `pagereveal` listener must run before the first render. On `pageswap` and `pagereveal` it names the image and title of the clicked card (`[data-post-card]`) and of the post header (`#post-hero`, render-blocked with `<link rel="expect">` in `BlogPostLayout`) as `post-image` and `post-title`, then removes the names. Cross-document view transitions only; other engines navigate normally (#210).
- Menu: no JS store. State lives in the DOM: invoker commands (`commandfor`/`command`) open and close the modal `dialog#site-menu`, and its only script closes it on `pagehide` so Back restores it closed. Blog categories: no client state; each category is a static page built by `getStaticPaths`, linked from `nav[aria-label="Blog categories"]` with `aria-current="page"` on the current link. `/blog/` and each category page are split at 10 posts by `paginate()`: page 1 at the base URL, then `2/`, linked from `nav[aria-label="Pagination"]` (#160).
