# 03 - Tooling Manifesto

## 1. Determinism Over Prompting
Do not rely on the LLM "remembering" to write good code. Enforce it at the system level.
- **Formatter/Linter:** `ESLint` (fast, strict).
- **Types:** Strict TypeScript (`strict: true`, `noImplicitAny`, etc.).
- **Git Hooks:** `husky` and `lint-staged` must block any commit that fails tests or linting.

## 2. CI/CD Pipeline
- GitHub Actions must run the full Vitest/Playwright suite and ESLint checks on every Pull Request.
- Deployments to Cloudflare Pages only occur if the CI pipeline passes.

## 3. AI Guardrails
Agent-side hooks are nudges, not controls. Enforcement lives in ESLint, `astro check`, Vitest coverage thresholds, `pr-lint.yml`, and server-side branch protection.

## 4. Native-First Principle
Adding third-party packages and custom scripts is a last resort. We enforce a "Native-First" approach:
- We rely on native Astro, Vitest, and Node APIs before pulling from npm.
- Any new dependency must be thoroughly researched and justified as the only viable path to achieve the standard.
- Custom scripts (like bash hooks) are only permitted when native tooling completely lacks the capability to enforce a rule.
