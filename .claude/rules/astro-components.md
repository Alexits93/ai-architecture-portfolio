---
paths:
  - "src/**/*.astro"
---
# Astro components

The site ships zero JavaScript by default because JS is the main INP and CSP risk on a static site.

- Before adding a `<script>`, check whether native HTML and CSS can hold the state: `<dialog>`, `popover`, invoker commands (`commandfor`/`command`), `<details>`, `:checked`, `:target`, `:has()`. Use JS only when they cannot, and state why in the Task issue.
- Client `<script>` code follows the same lint, typing and FSD rules as `.ts` files.
- Dynamic classes use `class:list`. Dynamic styles toggle a class or a `data-*` attribute styled in a scoped `<style>`; never `<style define:vars>`, which renders `style` attributes the hashed CSP blocks. ESLint blocks `class={...}` and `style={...}`.
- No `set:html` (XSS). The single exception is JSON-LD in `SeoHead.astro`, serialized by `serializeJsonLd`. ESLint enforces this.
- Every `<img>`, `<svg>` and embed has explicit `width` and `height` to keep CLS at 0. Raster images go through `astro:assets` `<Image>`/`<Picture>`.
- The LCP element is server-rendered, `loading="eager"`, `fetchpriority="high"`; everything below the fold is lazy. Name the LCP element in the Task issue.
- CSP target is Astro `security.csp` hashes with no `unsafe-inline` (plan Story C). Do not add new inline scripts or third-party embeds without updating the plan.
- Page transitions use native CSS `@view-transition`. Astro `ClientRouter`/`<ViewTransitions />` was rejected; its `astro:*` events never fire here.
- Inline SVG must not contain an XML declaration; it breaks the Astro compiler.
