---
paths:
  - "src/**/*.astro"
---

# Astro components

The site ships zero JavaScript by default because JS is the main INP and CSP risk on a static site.

- Before adding a `<script>`, check whether native HTML and CSS can hold the state: `<dialog>`, `popover`, invoker commands (`commandfor`/`command`), `<details>`, `:checked`, `:target`, `:has()`. Use JS only when they cannot.
- When JS is needed, it only enhances the native element, which keeps its own state (`open`, `:target`, focus); the script never holds a copy of it. Write it as a small processed `<script>`, with `data-*` attributes for server values (https://docs.astro.build/en/guides/client-side-scripts/).
- No custom elements or web components. Astro's docs offer them for per-instance scripts; this site does not use them (owner decision), and ESLint bans them.
- Every `<img>`, SVG component and embed has explicit `width` and `height` to keep CLS at 0. Raster images go through `astro:assets` `<Image>`/`<Picture>`.
- The LCP element is server-rendered, `loading="eager"`, `fetchpriority="high"`; everything below the fold is lazy.
- The CSP is Astro `security.csp` hashes with no `unsafe-inline`. No new inline scripts or third-party embeds.
- Page transitions use native CSS `@view-transition`. Astro `ClientRouter`/`<ViewTransitions />` was rejected; its `astro:*` events never fire here.
