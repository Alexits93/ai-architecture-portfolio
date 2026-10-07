# 03 - Tooling Manifesto

## 1. Determinism Over Prompting
Do not rely on the LLM "remembering" to write good code. Enforce it at the system level.
- **Formatter/Linter:** `Biome` (fast, strict).
- **Types:** Strict TypeScript (`strict: true`, `noImplicitAny`, etc.).
- **Git Hooks:** `husky` and `lint-staged` must block any commit that fails tests or linting.

## 2. CI/CD Pipeline
- GitHub Actions must run the full Vitest/Playwright suite and Biome checks on every Pull Request.
- Deployments to Cloudflare Pages only occur if the CI pipeline passes.

## 3. Deterministic AI Safeguards (Anti-Slop Hook)
To prevent the AI from bypassing prose-only instructions, we implement **Hard System-Level Guardrails** using Antigravity lifecycle hooks.

- **Location:** `.agents/hooks.json`
- **Implementation:** `PreToolUse` hook targeting `write_to_file` and `replace_file_content`.
- **Script:** `.agents/scripts/anti-slop-guard.js`
- **Mechanism:** Before any code or documentation is physically written to the disk, this script parses the output payload. If a banned word (e.g., 'delve', 'robust') is detected, it returns a `"deny"` signal. This hard-blocks the tool call and forces the AI to regenerate its output without the slop.

## 4. Native-First Principle
Adding third-party packages and custom scripts is a last resort. We enforce a "Native-First" approach:
- We rely on native Astro, Vitest, and Node APIs before pulling from npm.
- Any new dependency must be thoroughly researched and justified as the only viable path to achieve the standard.
- Custom scripts (like bash hooks) are only permitted when native tooling completely lacks the capability to enforce a rule.
