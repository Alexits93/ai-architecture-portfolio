# Architecture

Feature-Sliced Design: `pages > widgets > features > entities > shared`. A layer imports only from layers below it (ESLint enforced). The map shows cross-slice imports; update it when a slice or page is added or removed.

```mermaid
flowchart TD
    subgraph Pages
        Index["index.astro"]
        CV["cv.astro"]
        BlogIndex["blog/index.astro"]
        BlogPost["blog/[slug].astro"]
        Cookie["cookie-disclaimer.astro"]
        Privacy["privacy-policy.astro"]
        OG["og.png.ts"]
    end

    subgraph Widgets
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

    subgraph Features
        Filter["blog-post-filter"]
    end

    subgraph Entities
        Post["blog-post"]
    end

    subgraph Shared
        SkillTag["ui/skill-tag"]
        ArticleNav["ui/article-navigator"]
        SeoHead["ui/seo-head"]
        Store["stores/ui"]
        OgLib["lib/og"]
        Config["config"]
    end

    Index --> Header & Menu & AboutMe & Featured & Recommended
    CV --> Header & Menu & AboutMe & Experience
    BlogIndex --> Header & Menu & Feed
    BlogPost --> Header & Menu & Footer & Reader & Recommended & SeoHead
    Cookie --> Header & Menu & CookieW
    Privacy --> Header & Menu & PrivacyW
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
- Theme: `themeStore` (`@nanostores/persistent`, localStorage key `theme`) in `src/shared/stores/ui`. Only the `Header` client script reads and writes it. `public/theme.js` applies the stored theme before first paint.
- Menu and blog filter: no JS store. State lives in the DOM (form controls, `hidden` attributes).
