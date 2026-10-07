# 08 - Architectural Boundaries (Feature-Sliced Design)

To prevent the "big ball of mud" anti-pattern and emulate the strictness of Nx mono-repos within our Astro structure, we enforce **Feature-Sliced Design (FSD)** using `@conarti/eslint-plugin-feature-sliced`.

## The Hierarchy (Strict Unidirectional Flow)
Lower layers cannot import from higher layers. The ESLint boundary plugin statically enforces this.

1. **`app/`**: Global initialization, routing, layouts.
2. **`pages/`**: Compositional routing layer (Astro pages).
3. **`widgets/`**: Independent, composed blocks (e.g., `<Header />`, `<Sidebar />`).
4. **`features/`**: User interactions yielding business value (e.g., `ThemeToggle`, `SearchPosts`).
5. **`entities/`**: Business domains (e.g., `User`, `Post`).
6. **`shared/`**: Reusable infrastructure (e.g., UI kit, config, utilities).

## The Rules
- **No Cross-Importing Upward:** A `feature` cannot import a `widget`. `shared` cannot import anything outside of `shared`.
- **Public API Only:** Slices must expose their logic via an `index.ts`. Deep imports (e.g., `import X from 'features/auth/internal/file'`) are strictly banned by the linter.
