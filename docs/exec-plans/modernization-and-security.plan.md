# Execution Plan: Modernization, Security Hardening & Images

> Source of truth for upcoming iterations. It supersedes the old `modernization-plan.md`, which lived outside the repo and is now obsolete.
> The reasons behind every item are in [`plan-and-security-review.md`](./plan-and-security-review.md).
> Keep this file in sync: tick items only when they are merged to `master`.

## Status of the old epic (UX Modernization & A11y)
- [x] Native CSS view transitions (`@view-transition { navigation: auto; }`). Astro `<ViewTransitions />` / `ClientRouter` / `transition:persist` are **rejected**. Do not reintroduce them.
- [x] Theme switcher fixed. The OS dark-mode fallback is scoped to `:root:not([data-theme])`.
- [x] `scrollbar-gutter: stable` on `html` (no header shift on scroll lock).
- [x] Opaque menu backdrop with a CSS `clip-path` circle reveal and staggered links.
- [~] Old Story 2 (JS `aria-expanded` sync) and old Story 3 (`:has()` polyfill): **cancelled**, replaced by Story A.

## Order of work
0. **Owner action (not code):** make the repo public (or upgrade to Pro) and enable branch protection on `master`: require PR, require the status checks `quality-gate`, `security-gate`, `build-gate`, `pr-lint`, block force-push and deletion. Until then, every gate below is advisory.
1. Story S (security quick wins)
2. Story D (docs truthfulness)
3. Story A (native dialog menu)
4. Story L (BaseLayout + SEO)
5. Story P (Spotify consent facade)
6. Story C (CSP + headers)
7. Story Q (quality gates)
8. Story 4 (image pipeline)

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

### Story A: Native `<dialog>` menu, no JavaScript (replaces old Stories 2 + 3)
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

### Story L: Shared BaseLayout + SEO
- [ ] `src/app/layouts/BaseLayout.astro` (or the FSD-appropriate location): one `<head>` with favicons, manifest, viewport, theme script and `SeoHead`.
- [ ] All 6 pages use it. Every page gets a title, description, canonical and OG tags (today only the blog post page has them).
- [ ] Replace the hand-written `public/sitemap.xml` with `@astrojs/sitemap`.

### Story P: Spotify consent facade (GDPR/ePrivacy + performance)
- [ ] Render a static button (track title + play icon). Insert the iframe only after the user clicks.
- [ ] Rewrite `CookieDisclaimer` / `PrivacyPolicy`: no third-party content loads without action; remove "do not track" and "by continuing you agree".

### Story C: CSP & security headers
- [ ] Enable Astro `security.csp` (hash-based, emitted as a meta tag). Directives: `default-src 'self'`; `frame-src https://open.spotify.com`; `img-src 'self' data:`; no `unsafe-inline`.
- [ ] Host headers (needs the hosting decision): `frame-ancestors 'none'`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, HSTS.
- [ ] e2e: no CSP violations in the console on every page.

### Story Q: Quality gates that check what they claim
- [ ] `astro check` (`@astrojs/check`) in pre-commit and CI (`tsc` skips `.astro` files).
- [ ] Run Playwright in CI (`--reporter=line` locally, `github` in CI).
- [ ] e2e link checker: every internal `href` returns 200.

### Story 4: Image optimization pipeline
- [ ] Recreate `feat/image-optimization-pipeline` from current `master`. The existing branch predates the asset cleanup.
- [ ] Blog images live in `src/assets/images/`, referenced via the content collection `image()` schema helper.
- [ ] `<Picture formats={['avif','webp']}>` with explicit `width`/`height`.
- [ ] The featured/LCP image: `loading="eager" fetchpriority="high"`; everything else lazy.
- [ ] Keep `placeholder.webp` as the fallback.

## Open product decisions (owner)
- Hosting: Cloudflare Pages (per AI_INSTRUCTIONS.md). Headers live in `public/_headers`.
- Public repo vs GitHub Pro.
- i18n strategy, RSS feed, 404 page.
