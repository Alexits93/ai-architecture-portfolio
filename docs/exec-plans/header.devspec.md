# DevSpec: Header Behavioral Matrix

This matrix dictates the Test-Driven Development (TDD) parameters for the Header component.

## 1. State & Interaction Matrix
| Action | Input/Trigger | Expected Output / State Change |
| :--- | :--- | :--- |
| **Initialize** | Page Load | Render logo, theme toggle, and menu button. |
| **Theme Toggle** | Click `.theme-toggle` button | Dispatches theme change event or updates `themeStore`. |
| **Menu Toggle** | Click `.menu-toggle` button | Toggles the `$isMenuOpen` Nano Store boolean. |

## 2. Accessibility (a11y) Constraints
- The logo link must contain `<span class="sr-only">Back to Home page</span>`.
- The theme toggle must have an explicit `aria-label` or `alt` text on the icon declaring the current mode.
- The menu toggle must dynamically update `aria-expanded="true/false"` based on `$isMenuOpen`.

## 3. Structural Constraints (Tooling Manifesto)
- **Zero JS Default:** Client-side JavaScript must be strictly isolated. We will use a lightweight `<script>` tag or an Astro Island for the toggle logic to ensure the rest of the header remains static HTML.
- **Composition:** The `NavigatorMenu.astro` component will not be nested *inside* the Header logic. They will be composed together at the Layout level.
