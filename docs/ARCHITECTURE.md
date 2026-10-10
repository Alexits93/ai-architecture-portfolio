# Architecture

Target structure: Astro's conventions (ADR 002), imports flow `pages > layouts > components > lib` (ESLint enforced). The tree still holds the legacy folders `src/widgets`, `src/features`, `src/entities` and `src/shared`, which Story #76 moves. The map shows today's imports between folders; update it when a page, layout or component is added or removed.

```mermaid
flowchart TD
    subgraph Pages["src/pages"]
        Index["index.astro"]
        CV["cv.astro"]
        BlogIndex["blog/index.astro"]
        BlogPost["blog/[slug].astro"]
        Cookie["cookie-disclaimer.astro"]
        Privacy["privacy-policy.astro"]
        OG["og.png.ts"]
    end

    subgraph Layouts["src/layouts"]
        Base["BaseLayout.astro"]
    end

    subgraph Widgets["src/widgets"]
        Header["header"]
        Menu["navigator-menu"]
        Footer["footer"]
        AboutMe["about-me"]
        Experience["experience-list"]
        Featured["blog-post-featured"]
        Recommended["blog-post-recommended"]
        Feed["blog-feed"]
        Reader["blog-post-reader"]
        CookieW["cookie-disclaimer"]
        PrivacyW["privacy-policy"]
    end

    subgraph Features["src/features"]
        Filter["blog-post-filter"]
    end

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

    Index & CV & BlogIndex & BlogPost & Cookie & Privacy --> Base
    Base --> Header & Menu & SeoHead
    Index --> AboutMe & Featured & Recommended & Config
    CV --> AboutMe & Experience
    BlogIndex --> Feed
    BlogPost --> Footer & Reader & Recommended
    Cookie --> CookieW
    Privacy --> PrivacyW
    OG --> OgLib

    Header --> Store
    Experience --> SkillTag
    Feed --> Filter & Post
    Featured --> Post
    Recommended --> Post & Config
    Reader --> ArticleNav & SkillTag
    Post --> SkillTag & Config
```

## State
- Theme: `BaseLayout` loads `public/theme.js` once per page. `themeStore` (`@nanostores/persistent`, localStorage key `theme`) in `src/shared/stores/ui`. Only the `Header` client script reads and writes it. `public/theme.js` applies the stored theme before first paint.
- Menu and blog filter: no JS store. State lives in the DOM (form controls, `hidden` attributes).
