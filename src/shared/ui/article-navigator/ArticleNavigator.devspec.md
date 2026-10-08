# ArticleNavigator DevSpec

## Behavior Matrix
| Condition | Behavior |
|---|---|
| Given a valid array of headings (depth 2-6) | Renders a `<nav>` container with anchor tags for each heading. |
| Each heading | Renders an `<a>` with `href="#<slug>"` and the heading text. |
| Indentation | Applies CSS classes based on depth (e.g., `h3-link`, `h4-link`) for nested indentation. |
| Empty headings | Renders an empty `<nav>` container without crashing. |

## Technical Constraints
- No `any` or `unknown`.
- Uses native Astro styling (`<style>` block).
- Must have 100% Vitest coverage.
- Uses `Astro.props` with `Heading` interface from Astro natively.
