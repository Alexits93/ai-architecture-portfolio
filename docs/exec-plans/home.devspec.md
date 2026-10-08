# DevSpec: Home Page (`pages/index.astro`)

## 1. Security (OWASP)
- Layout only. Uses standard Astro SSG, zero dynamic client-side DOM insertion.
- CSP headers are inherently maintained by the framework.

## 2. Performance (Web Vitals)
- **LCP/CLS:** Prevents CLS by providing a structured CSS grid out of the box. No hydration or client-side Javascript involved for the layout.
- **INP:** Fully static HTML layout means zero JavaScript blocking the main thread.

## 3. Maintainability (FSD)
- Follows Feature-Sliced Design.
- `pages/index.astro` composes widgets (`widgets/about-me`, `widgets/blog-post-featured`, `widgets/blog-post-recommended`).
- No cross-imports upward.

## 4. Test-Driven Constraints
- A test in `e2e/home.spec.ts` must verify that the `<main>` tag contains the `home-wrapper` and the three widgets.
- The CSS grid structure (`home-wrapper`, `home-top-wrapper`, `home-bottom-wrapper`) must be present in the DOM.
