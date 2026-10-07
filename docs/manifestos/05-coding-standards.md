# 05 - Coding Standards & Engineering Principles

## 1. Package Management (Security First)
- **Strictly `pnpm`:** Due to strict node_modules resolution and supply-chain security, `pnpm` is the only permitted package manager. `npm` and `yarn` are explicitly banned.
- **Lockfile Integrity:** `pnpm-lock.yaml` is the ultimate source of truth.

## 2. Code Complexity & Constraints
Code must be deterministic, readable, and strictly scoped.
- **Maximum Function Length:** 25 lines. Forces Single Responsibility Principle (SRP).
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
- **Static-First (Zero JS Default):** Astro components must ship zero runtime JavaScript to the client unless explicitly required via client directives (`client:load`, `client:idle`).
- **Strict Typing:** TypeScript is not optional. `any` is strictly banned. Unknown structures must be typed as `unknown` and parsed via schema validation (e.g., Zod).
- **Modernization Mandate:** Always utilize the latest available features of HTML5, CSS3/SCSS, and TypeScript. Never port outdated legacy practices; improve the code baseline while ensuring visual parity during migration.
