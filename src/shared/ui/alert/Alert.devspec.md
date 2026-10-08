# Alert Component DevSpec

## 1. Description
A shared UI notification component replacing the legacy `app-alert` web component. It displays success, info, warning, or error messages.

## 2. API / Props
- `type`: `'success' | 'info' | 'warning' | 'error'` (default: `'success'`)
- `text`: `string` (required)
- `dismissible`: `boolean` (default: `false`)
- `duration`: `number` (default: `8000` ms)

## 3. Security (XSS Prevention)
- Astro's default HTML escaping will handle the `text` prop natively. No `set:html` will be used for user-provided text.
- The SVG icons are static internal templates, avoiding external injection risks.

## 4. Performance (Web Vitals)
- **INP:** The component uses CSS animations for rendering and the timer bar. JavaScript is limited to a vanilla custom element (`<ui-alert>`) strictly for DOM removal upon click or timeout. No heavy hydration directives (`client:load`) are used.
- **CLS:** The alert utilizes `position: fixed` outside the normal document flow. It will not cause layout shifts to the primary content structure.

## 5. Architectural Boundaries (FSD)
- Location: `src/shared/ui/alert/`
- Does not import from `features`, `widgets`, or `pages`. Exposes its public API through an `index.ts`.

## 6. Behavioral Matrix (TDD)
1. **Given** valid props, **it should** render the base HTML structure with `role="alert"`.
2. **Given** a specific `type` prop, **it should** render the corresponding SVG icon and apply the correct type-specific styling classes.
3. **Given** the `text` prop, **it should** render the text safely inside the body.
4. **Given** `dismissible` is `true`, **it should** render the footer timer element with the `animation-duration` matching the `duration` prop.
5. **Given** `dismissible` is `false`, **it should not** render the footer timer element.
