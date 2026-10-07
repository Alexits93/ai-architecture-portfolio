# Navigator Menu Component DevSpec

## 1. Security (OWASP XSS Prevention)
- **No `set:html`:** The component will only render static text via Astro's standard escaping interpolation (`{item.name}`) or explicitly parsed markdown. It will NOT use `set:html` for link rendering.
- **Strict URLs:** Ensure link paths are validated or are part of a statically defined `routes` configuration object, preventing XSS payloads in `href`.

## 2. Performance (Web Vitals)
- **CLS/LCP Guarantees:** 
  - The menu overlay uses `position: fixed` and does not push content, ensuring zero Cumulative Layout Shift (CLS) when toggled.
  - The CSS transitions rely on `transform` and `opacity` to avoid repaints.
- **Hydration:**
  - Client-side interactivity is limited to a vanilla JS `<script>` tag in Astro. We will not ship heavy framework bundles just for a menu toggle. 

## 3. Maintainability (FSD)
- **Layer:** `widgets/header` (or `widgets/navigator-menu` if independent, but it acts as a core layout feature). Following the header implementation, we will place it in `src/widgets/navigator-menu/ui/NavigatorMenu.astro`.
- **Typing:** Strict TypeScript interfaces for route configuration. No `any` or `unknown`.

## 4. Testing (TDD Strategy)
- **Vitest + JSDOM:** Ensure the menu renders correctly in isolation given a set of route objects.
- **Interactivity Test:** Verify that clicking a link triggers the `toggleMenu()` store action to close the menu.
