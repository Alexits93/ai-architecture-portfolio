---
paths:
  - "src/**"
---
# Feature-Sliced Design

Layers, highest to lowest: `app > pages > widgets > features > entities > shared`. A layer imports only from layers below it. `@conarti/eslint-plugin-feature-sliced` enforces this; the lint hook reports violations after each edit.

- Import other slices through their `index.ts` public API with the `@/` alias, for example `import { Header } from '@/widgets/header'`. Deep paths such as `@/widgets/header/ui/Header.astro` break the slice boundary.
- A new slice ships with an `index.ts`.
- `src/pages/` is the FSD `pages` layer and may not import `app`. Global tokens and layout CSS therefore live in `src/shared/styles/`.
- Pages stay compositional: no inline `<style>` in `src/pages/`. Page styling goes to `src/shared/styles/global.css` or a layout widget.
- `shared` holds pure, domain-free code. Extract to `shared` on the third identical use, not earlier (AHA).
- Validate input at module boundaries (content schemas, config) and trust it inside.
- Adding or removing a slice or page: update the mermaid map in `docs/ARCHITECTURE.md` in the same change.
