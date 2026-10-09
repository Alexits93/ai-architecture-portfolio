---
paths:
  - "src/**/*.astro"
---
# Astro components

The site ships zero JavaScript by default because JS is the main INP and CSP risk on a static site.

- Before adding a `<script>`, check whether native HTML and CSS can hold the state: `<dialog>`, `popover`, invoker commands (`commandfor`/`command`), `<details>`, `:checked`, `:target`, `:has()`. Use JS only when they cannot, and state why in the Task issue.
- When JS is needed, use the pattern the Astro docs describe (https://docs.astro.build/en/guides/client-side-scripts/): a processed `<script>`, `data-*` attributes to pass server values, and a custom element when the script needs per-instance scope.
- Client `<script>` code follows the same lint, typing and import-boundary rules as `.ts` files.
- Dynamic classes use `class:list`; dynamic styles use `<style define:vars>`. ESLint blocks `class={...}` and `style={...}`.
- No `set:html` (XSS). The single exception is JSON-LD in `SeoHead.astro`, serialized by `serializeJsonLd`. ESLint enforces this.
- Every `<img>`, `<svg>` and embed has explicit `width` and `height` to keep CLS at 0. Raster images go through `astro:assets` `<Image>`/`<Picture>`.
- The LCP element is server-rendered, `loading="eager"`, `fetchpriority="high"`; everything below the fold is lazy. Name the LCP element in the Task issue.
- CSP target is Astro `security.csp` hashes with no `unsafe-inline` (plan Story C). Do not add new inline scripts or third-party embeds without updating the plan.
- Page transitions use native CSS `@view-transition`. Astro `ClientRouter`/`<ViewTransitions />` was rejected; its `astro:*` events never fire here.
- Inline SVG must not contain an XML declaration; it breaks the Astro compiler.
