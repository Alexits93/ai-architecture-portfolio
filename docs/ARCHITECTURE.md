# Architecture Visualization

This document provides a living visualization of the repository's feature-sliced design (FSD) architecture and component hierarchy.

## Component Tree

```mermaid
flowchart TD
    %% Layers
    subgraph Pages ["Pages (Layer)"]
        Index["src/pages/index.astro"]
        CV["src/pages/cv.astro"]
        CookieDisclaimer["src/pages/cookie-disclaimer.astro"]
        PrivacyPolicy["src/pages/privacy-policy.astro"]
        BlogIndex["src/pages/blog/index.astro"]
        BlogPost["src/pages/blog/[slug].astro"]
    end
    
    subgraph Widgets ["Widgets (Layer)"]
        Header["Header (src/widgets/header)"]
        NavigatorMenu["NavigatorMenu (src/widgets/navigator-menu)"]
        AboutMe["AboutMe (src/widgets/about-me)"]
        BlogPostFeatured["BlogPostFeatured (src/widgets/blog-post-featured)"]
        BlogPostRecommended["BlogPostRecommended (src/widgets/blog-post-recommended)"]
    end
    
    subgraph Shared ["Shared (Layer)"]
        UIStore["UI Store (src/shared/stores/ui)"]
    end
    
    %% Relationships
    Pages --> Header
    Index --> NavigatorMenu
    Index --> AboutMe
    Index --> BlogPostFeatured
    Index --> BlogPostRecommended
    
    Header --> UIStore
```

## State Management

- **UI Store (`themeStore`)**: Managed via Nano Stores in `src/shared/stores/ui`. Only the `Header` reads this store to handle visual state reactively across Astro Islands.
