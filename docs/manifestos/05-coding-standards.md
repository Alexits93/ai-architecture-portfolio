# 05 - Coding Standards & Engineering Principles

## 1. Package Management (Security First)
- **Strictly `pnpm`:** Due to strict node_modules resolution and supply-chain security, `pnpm` is the only permitted package manager. `npm` and `yarn` are explicitly banned.
- **Lockfile Integrity:** `pnpm-lock.yaml` is the ultimate source of truth.

## 2. Code Complexity & Constraints
Code must be deterministic, readable, and strictly scoped.
- **Maximum Function Length:** 25 lines (50 for some specs). Forces Single Responsibility Principle (SRP). *Note: In test files, `describe` blocks written as arrow functions count towards `max-lines-per-function`. Split large test suites into multiple smaller `describe` blocks to comply.*
- **Maximum Parameters:** 3 parameters. If more are needed, use a strongly-typed configuration object (interface/type).
- **Maximum File Length:** 250 lines. Files exceeding this must be decomposed into logical modules.
- **Cyclomatic Complexity:** Maximum 5 branches per function. Use early returns and guard clauses instead of nested `if/else` statements.

## 3. Abstraction vs. Duplication
- **The Rule of Three (AHA Programming):** Avoid Hasty Abstractions (AHA). It is better to duplicate code twice (WET) than to create a premature, overly complex abstraction. Only extract to a shared utility/component when the exact logic is needed a *third* time.
- **De-coupling:** Abstractions must not couple unrelated domains. Shared utilities must be purely functional.

## 4. Engineering Principles & Patterns
- **Pure Functions & Immutability:** Functions must be pure (no side effects) wherever possible. Data structures should be treated as immutable (use spread operators, array mapping, not direct mutation).
- **Composition over Inheritance:** Build complex UI components and logic modules by composing smaller, independent functions/components, never through class inheritance.
- **Fail-Fast Error Handling:** Validate inputs immediately at module boundaries. Throw errors early rather than passing invalid state down the call stack.

## 5. Architectural Principles
- **Static-First (Zero JS Default):** Astro components must ship zero runtime JavaScript to the client unless explicitly required. 
- **The HTML5 State Law:** You are strictly forbidden from tracking visual or selection state in JavaScript arrays/variables (e.g., `selectedTags: string[]`) or manually toggling classes if a native HTML form element (e.g., `<input type="checkbox">`, `<input type="radio">`) and CSS pseudo-classes (`:checked`) can handle it natively. The DOM *is* the state.
- **Strict Typing:** TypeScript is not optional. `any` is strictly banned. Unknown structures must be typed as `unknown` and parsed via schema validation (e.g., Zod).
- **Modernization Mandate:** Always utilize the latest available features of HTML5, CSS3/SCSS, and TypeScript. Never port outdated legacy practices; improve the code baseline while ensuring visual parity during migration.

## 6. Version Control Standards
- **Branch Management:** Always create and switch to a properly named branch before starting work (e.g., `feat/migrate-[component]`, `fix/[issue]`). Do not pile unrelated features into the same branch.
- **Conventional Commits:** Commit messages must strictly adhere to the Conventional Commits specification (e.g., `feat(...)`, `fix(...)`, `docs(...)`, `chore(...)`) as enforced by `commitlint`.

## 7. Idiomatic Tooling Over Hacks
- **No Mixing Principles with Hacks:** When adhering to architectural principles (such as the HTML5 State Law), never compromise the idiomatic best practices of the tool/framework in use. For example, instead of using messy inline `style="..."` interpolation in Astro, use native features like `define:vars` or `class:list`. The tools must be utilized in their designed, optimal way without falling back to lower-level string manipulation hacks.
