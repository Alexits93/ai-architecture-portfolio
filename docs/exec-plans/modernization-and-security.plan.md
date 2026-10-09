# Execution Plan: Modernization, Security Hardening & Images

> Source of truth for upcoming iterations. It supersedes the old `modernization-plan.md`, which lived outside the repo and is now obsolete.
> The reasons behind every item are in [`plan-and-security-review.md`](./plan-and-security-review.md).
> Keep this file in sync: tick items only when they are merged to `master`.

## Status of the old epic (UX Modernization & A11y)
- [x] Native CSS view transitions (`@view-transition { navigation: auto; }`). Astro `<ViewTransitions />` / `ClientRouter` / `transition:persist` are **rejected**. Do not reintroduce them.
- [x] Theme switcher fixed. The OS dark-mode fallback is scoped to `:root:not([data-theme])`. (The inline script still always sets `data-theme`, so the fallback is dead. See Story L.)
- [x] `scrollbar-gutter: stable` on `html` (no header shift on scroll lock).
- [x] Opaque menu backdrop with a CSS `clip-path` circle reveal and staggered links.
- [~] Old Story 2 (JS `aria-expanded` sync) and old Story 3 (`:has()` polyfill): **cancelled**, replaced by Story A.

## Order of work
Principle: fix the gates first (every later story relies on them), then the docs (agents treat docs as truth), then cheap bugs, then features. Items marked **(research)** need a check against current official docs before coding.

0. **Owner action (not code):** make the repo public (or upgrade to Pro) and enable branch protection on `master`: require PR, require the status checks `quality-gate`, `security-gate`, `build-gate`, `pr-lint`, block force-push and deletion. Until then, every gate below is advisory.
1. ~~Story S (security quick wins)~~ done
2. ~~Story D (docs truthfulness)~~ done
3. **P0** Story Q (quality gates that check what they claim)
4. **P1** Story D2 (agent context architecture)
5. **P1** Story B (bug fixes found in the 2026-10-09 audit)
6. **P2** Story A (native dialog menu)
7. **P2** Story L (BaseLayout + SEO + theme)
8. **P2** Story C (CSP + headers)
9. ~~Story P (Spotify consent facade)~~ dropped: the Spotify embed is removed (see Story C)
10. **P3** Story 4 (image pipeline)

---

### Story S: Security quick wins
- [x] Remove `id-token: write` from `release.yml` (the package is private and never published).
- [x] Fix the broken `/privacy-policy` link (trailing slash).
- [x] `pnpm.overrides` `fflate >=0.7.5` (build-time only, but keeps audit green).
- [x] Pin third-party GitHub Actions to full commit SHAs (`davelosert/vitest-coverage-report-action`, `dorny/test-reporter`, and ideally the `actions/*` and `pnpm/action-setup` ones too).
- [x] Remove `"preinstall": "npx only-allow pnpm"`. The `packageManager` field + Corepack already enforces pnpm.
- [x] Upgrade pnpm 9 → 10. Add `onlyBuiltDependencies` (allowlist, e.g. `@resvg/resvg-js`, `esbuild`) and `minimumReleaseAge: 1440`. **Move `pnpm.overrides` from `package.json` to `pnpm-workspace.yaml`**: pnpm 10+ ignores the `package.json` field (the local global pnpm already warns about it).
- [x] Cloudflare Pages security headers in `public/_headers`: `frame-ancestors 'none'`, nosniff, Referrer-Policy, Permissions-Policy, HSTS, COOP. The script/style CSP comes in Story C.
- [x] `release.yml`: drop the duplicate `pnpm install` (the composite action already installs).
- [x] Agent hooks (`.agents/hooks.json`): verify the working directory hooks run in and fix the script paths (`scripts/…` vs `.agents/scripts/…`). Make `anti-slop-guard.js` block (deny) when it errors. Document that hooks are nudges; server-side branch protection is the real control.
- [x] Inline theme script: wrap in `try`, accept only `'light' | 'dark'`.

### Story D: Make the docs true (agents treat docs as truth)
- [x] `docs/ARCHITECTURE.md`: remove the nonexistent `isMenuOpen` store; show all pages; nothing but `Header` reads `themeStore`.
- [x] `header.spec.md`, `navigator-menu.spec.md`: remove `isMenuOpen`; describe the actual (then dialog-based) behaviour.
- [x] `view-transitions.spec.md` / `.devspec.md`: native CSS only.
- [x] Manifesto 09: rewrite for `output: 'static'`:
  - drop SSR, `checkOrigin`, server nonces, DOMPurify and `client:load` rules;
  - state CSP = Astro `security.csp` hashes (meta tag) + host headers.
- [x] Fix the PR linkage convention: `Closes #N` must reference the Story/Task issue, never the PR itself.

### Story A (P2): Native `<dialog>` menu, no JavaScript (replaces old Stories 2 + 3)
**Before coding:** check current Baseline status on MDN/web.dev for Invoker Commands (`commandfor`/`command`), `closedby`, `@starting-style`, `transition-behavior: allow-discrete`. If they are not Baseline, the fallback is ~3 lines of JS calling `showModal()`/`close()`.
- [ ] Hamburger: `<button commandfor="site-menu" command="show-modal" aria-label="Open menu">`.
- [ ] `<dialog id="site-menu" closedby="closerequest">`: Esc closes it, backdrop clicks do not.
- [ ] The X close button (`command="close"`) lives inside the dialog, positioned exactly over the hamburger, with the same morph animation.
- [ ] Scroll lock: `html:has(dialog[open]) { overflow: hidden; }`.
- [ ] Move the circle reveal and staggered links onto the dialog via `@starting-style` + `allow-discrete` (`display`, `overlay`).
- [ ] Delete: the hidden checkbox, the menu `<script>` in `Header.astro`, every `body.is-menu-open` / `body:has(#mobile-menu-toggle…)` selector, all menu z-index values.
- [ ] Tests:
  - unit: the button has `commandfor`/`command`, the dialog has `closedby`;
  - e2e: open, Esc closes, backdrop click does NOT close, X closes, focus returns to the hamburger.

### Story L (P2): Shared BaseLayout + SEO
- [ ] `src/app/layouts/BaseLayout.astro` (or the FSD-appropriate location): one `<head>` with favicons, manifest, viewport, theme script and `SeoHead`.
- [ ] All 6 pages use it. Every page gets a title, description, canonical and OG tags (today only the blog post page has them).
- [ ] Replace the hand-written `public/sitemap.xml` (dated 2024, no blog posts) with `@astrojs/sitemap`. **(research: native endpoint vs integration, per Native-First)**
- [ ] One theme script, in the layout only (today duplicated in `index.astro` and `SeoHead`). Without a stored choice it must not set `data-theme`, so the `prefers-color-scheme` fallback in `global.css` applies. Today it forces `light`.
- [ ] Evaluate dropping `nanostores` + `@nanostores/persistent`: one toggle reads and writes one `localStorage` key. **(research: cross-tab sync need, `storage` event)**

### Story C (P2): CSP & security headers
- [ ] Astro `security.csp` (hash-based `<meta>` tag): `default-src 'self'`, `frame-src 'none'`, `base-uri 'none'`, `object-src 'none'`, `require-trusted-types-for 'script'`, no `unsafe-inline`. The site embeds no third-party content; the Spotify iframe is removed, and `CookieDisclaimer`/`PrivacyPolicy` state that no cookies are set.
- [ ] `public/_headers` in statichost.eu syntax (`*` is site-wide): `frame-ancestors 'none'`, `X-Frame-Options`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, HSTS two years with `includeSubDomains` (no preload submission: `.dev` is preloaded as a TLD), COOP and CORP `same-origin`, immutable one-year cache on `/_astro/*`. Gate: `tests/architecture/security-headers.spec.ts`.
- [ ] e2e: no CSP violations and no iframes on every page (`e2e/csp.spec.ts`).
- [ ] Hosting (owner): verify on statichost.eu that path rules (`/_astro/*`) work on the Hobby plan, and configure the apex `pa-tech.dev` 301 to `www`.

### Story Q: Quality gates that check what they claim (P0)
- [ ] `astro check` (`@astrojs/check`) in pre-commit, pre-push and CI (`tsc` skips `.astro` files). Done in `chore/claude-code-setup`.
- [ ] pnpm 12 (`packageManager` is the single version source; CI uses `pnpm/action-setup` v6 without `version`). All pnpm settings live in `pnpm-workspace.yaml`: `minimumReleaseAge: 1440`, `allowBuilds`, the `fflate` override. `.npmrc` holds auth only. Gate: `tests/architecture/supply-chain.spec.ts`.
- [ ] Run Playwright in CI (`--reporter=line` locally, `github` in CI). Add a `e2e-gate` job and require it.
- [ ] Coverage honesty: v8 skips all `.astro` files ("empty files skipped"), so "100%" covers only `.ts`. Either exclude `**/*.astro` explicitly and document that components are gated by AstroContainer + e2e, or find a working instrumentation. **(research)**
- [ ] `eslint-plugin-jsx-a11y` declares peer `eslint <= 9`; the repo runs ESLint 10. Verify the a11y rules actually fire (add a failing fixture test in `tests/config/eslint.spec.ts`), or switch plugin. **(research)**
- [ ] Import `z` from `astro/zod` instead of `astro:content` (deprecated). **(research: confirm Astro 7 guidance)**
- [ ] Enable `@conarti/feature-sliced/public-api` for `src/pages/**` (it is switched off, which let deep imports through in `blog/[slug].astro`). Keep only `import-order` off if needed.
- [ ] e2e link checker: every internal `href` returns 200.

### Story D2: Agent context architecture (P1)
Resolved in `chore/claude-code-setup` (tick on merge):
- [ ] Manifestos replaced by path-scoped `.claude/rules/` (load on matching files) and the `/migrate-legacy` skill. Contradictions resolved: `unknown` stays banned (ESLint wins), no `eslint-disable` escape hatch for `any`, MSW and Vitest browser-mode mandates dropped, MDX/SCSS claims corrected, `getBoundingClientRect` menu rule dropped (conflicts with Story A).
- [ ] `set:html` banned by `astro/no-set-html-directive`, with `SeoHead.astro` (JSON-LD) as the only exception.
- [ ] Hooks: anti-slop block on Markdown writes, ESLint feedback after each edit.
- [ ] `tests/architecture/agent-context.spec.ts`: fails when CLAUDE.md exceeds its budget, a rule glob matches no file, or agent docs reference a missing path.
Still open:
- [ ] Archive specs, devspecs and `*-pathology.md` for shipped components. Git history keeps them.

### Story B: Bug fixes from the 2026-10-09 audit (P1)
- [ ] `src/pages/blog/[slug].astro`: import `BlogPostReader` and `SeoHead` through their `index.ts` (add the missing `widgets/blog-post-reader/index.ts`).
- [ ] Remove the dead `astro:page-load` listener in `Header.astro` (ClientRouter is rejected, the event never fires).
- [ ] OG image: wrong site name ("Patrika"). Read title/description from `SITE` config.
- [ ] Pass `publishedTime={post.data.publishDate}` and `BlogPosting` JSON-LD to `SeoHead` on blog posts.

### Story 4 (P3): Image optimization pipeline
- [ ] Recreate `feat/image-optimization-pipeline` from current `master`. The existing branch predates the asset cleanup.
- [ ] Blog images live in `src/assets/images/`, referenced via the content collection `image()` schema helper.
- [ ] `<Picture formats={['avif','webp']}>` with explicit `width`/`height`.
- [ ] The featured/LCP image: `loading="eager" fetchpriority="high"`; everything else lazy.
- [ ] Keep `placeholder.webp` as the fallback.

## Open product decisions (owner)
- Hosting: Cloudflare Pages (per CLAUDE.md). Headers live in `public/_headers`.
- Public repo vs GitHub Pro.
- i18n strategy, RSS feed, 404 page.
