# Plan & Security Review

Scope:
- the modernization plan (`brain/43f3a806…/modernization-plan.md`)
- the `docs/` harness
- CI and the agent hooks
- supply chain
- all XSS surfaces in `src/`

Everything below was checked against the actual files. Nothing is inferred from the docs alone.

---

## Part 1: The modernization plan

**Verdict: 3 of the 4 stories are outdated or point the wrong way.** If the other model follows the plan as written, it will put back things you already rejected.

| Story | Status | Problem |
|---|---|---|
| 1. Astro `<ViewTransitions />` + `transition:persist` | **Outdated, delete** | Already replaced by native `@view-transition { navigation: auto; }`. `transition:persist` only exists with the ClientRouter you rejected. |
| 2. JS to sync `aria-expanded` on the checkbox | **Wrong approach** | Patches the checkbox hack instead of replacing it. A `<label>` carrying `aria-expanded` is still not a button to screen readers. |
| 3. JS polyfill for `:has()` (`.is-menu-open`) | **Delete** | `:has()` has been Baseline since Dec 2023 and is Widely Available by 2026. The fallback doubles every selector in Header/NavigatorMenu and adds JS for no benefit. |
| 4. `astro:assets` image pipeline | **Right goal, under-specified** | See below. |

### Replace Stories 2 and 3 with one story: native `<dialog>` menu, no JavaScript

The platform now does everything the checkbox, z-index juggling and JS are emulating:

```html
<button commandfor="site-menu" command="show-modal" aria-label="Open menu">…</button>

<dialog id="site-menu" closedby="closerequest" aria-label="Site navigation">
  <button commandfor="site-menu" command="close" aria-label="Close menu">…X…</button>
  <nav>…links…</nav>
</dialog>
```

| Your requirement | What provides it natively |
|---|---|
| Closes only with X or Esc | `closedby="closerequest"`: Esc closes it, backdrop clicks do not |
| Sits above everything | The **top layer**, so no z-index at all (10000/9999/9998 go away) |
| Background can't be clicked or focused | Modal dialog makes the rest of the page `inert` automatically |
| Focus trap, focus returns to the button | Built in |
| Screen reader semantics | `button` + `dialog` roles, no `aria-expanded` syncing needed |
| Scroll lock | `html:has(dialog[open]) { overflow: hidden; }` + the `scrollbar-gutter: stable` already added |
| Open/close animation | `@starting-style` + `transition-behavior: allow-discrete` on `display`/`overlay` (the circle reveal moves over 1:1) |

**What gets deleted:** the whole `<script>` block for the menu in `Header.astro` (Esc handler, link handler, aria syncing, body class), the hidden checkbox, every duplicated `body.is-menu-open` selector, and Stories 2 and 3.

**One trade-off:** the X button lives inside the dialog, positioned exactly over the hamburger. Visually it is the same morph.

> [!IMPORTANT]
> Invoker Commands (`commandfor`/`command`) and `closedby` are recent additions. Per your memory manifesto rule, the implementing agent must check current Baseline status on MDN or web.dev before using them. If they are not yet Baseline, the fallback is about 3 lines of JS calling `showModal()`/`close()`. The `<dialog>` element itself has been Baseline for years.

### Tighten Story 4 (images)
- Most images in `public/assets/images` were deleted, so the "migrate all images" task barely exists anymore. Note that the `feat/image-optimization-pipeline` branch **still has the old images and old code**. Rebase it onto master after PR #30 merges, or recreate the branch from master.
- Reference blog images with the content collection `image()` schema helper rather than "dynamic imports". The build then validates the path and type and optimizes the image.
- Use `<Picture formats={['avif','webp']}>`.
- The featured or hero image gets `loading="eager" fetchpriority="high"`; everything else stays lazy. Use explicit `width`/`height` for CLS.

### Missing from the plan (in priority order)
1. **A shared `BaseLayout.astro`.** Six pages copy-paste the full `<head>`, and the theme script now exists in six places. Only the blog post page uses `SeoHead`, so the other pages have **no canonical, description or OG tags**. This is an SEO bug, not just tidiness.
2. **Generate the sitemap at build time** (`@astrojs/sitemap`) instead of the hand-written `public/sitemap.xml`. It already drifted once; a generated sitemap can't.
3. **CSP and hosting headers** (see Part 2).
4. **Remove the Spotify embed** (see Part 2). Resolved by deletion, not by a facade.
5. A 404 page, an RSS feed and an i18n decision. These are product calls for you to make.

---

## Part 2: Security & safety assessment

### Clean (verified)
- **No secrets in the full git history.** I grepped every commit for GitHub, AWS, Slack, OpenAI and Google key patterns and private keys.
- **Every `set:html` is safe.** The only one is JSON-LD, and `serializeJsonLd` escapes `<` so a value can't break out with `</script>`.
- **`pr-lint.yml` reads the PR body safely.** It uses `context.payload` in JS rather than `${{ }}` string interpolation, so it is not script-injectable.
- **External links** all have `rel="noopener noreferrer"`.
- **Satori/OG input** is build-time and comes from constants only. Nothing at runtime can reach it.
- It is a **static site** with no server, forms, auth or API, so OWASP risks like injection, CSRF and broken auth don't apply.

### Findings, by real-world risk

#### High
1. **Every merge gate is advisory: master has no branch protection.**
   - `gh api …/branches/master/protection` returns 403 because the private repo is on the free plan.
   - CI, `pr-lint` and the "deterministic" PR safeguard can all be skipped. Anyone with push access can push or force-push to master, and that includes **an AI agent using your `gh` credentials**.
   - Fix options:
     - **(a)** Make the repo public, which is natural for a portfolio. Branch protection and rulesets are then free: require PRs, required status checks, no force-push, no deletion.
     - **(b)** Upgrade to Pro.
     - **(c)** Also give agents a fine-grained PAT with no admin rights and no ability to bypass rules.
2. **The agent hooks don't protect anything** (and may not even run).
   - `.agents/hooks.json` calls `node scripts/…`, but the files live in `.agents/scripts/`. Unless hooks run with `.agents/` as the working directory, these hooks error out.
   - `anti-slop-guard.js` **allows the action when it errors** (`catch → allow`).
   - `gh-pr-hook.js` only matches the substring `gh pr create`. `gh pr edit`, `gh api`, extra spaces or `git push` all get past it. In this session I updated the PR with `gh pr edit` and nothing stopped it.
   - Treat these as style nudges. The real control is #1 (server-side branch protection plus required checks). If you keep them, fix the paths and have them block when they error.
3. **The privacy and cookie text makes a false legal claim.**
   - `CookieDisclaimer.astro` says the Spotify cookies "do not track personal information" and that "by continuing to use our website, you agree".
   - The Spotify embed loads third-party cookies from a US company **before any consent**. Under GDPR/ePrivacy (CJEU *Planet49*), implied "by continuing" consent is not valid, and those cookies are not "essential".
   - Fix: the Spotify embed is removed, the site embeds no third-party content, and both texts state that no cookies are set. CSP `frame-src 'none'` enforces it.

#### Medium
4. **No CSP and no security headers at all.**
   - There is no hosting config (`_headers`, `vercel.json`, …) in the repo, and manifesto 09 says CSP is "non-negotiable".
   - Astro 6+ has `security.csp`, which hashes every bundled and inline script/style into a `<meta http-equiv="content-security-policy">` tag. That fits a static site, and the 6 inline theme scripts get hashed automatically.
   - A `<meta>` CSP cannot set `frame-ancestors` (clickjacking protection) or reporting. Those, plus `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` and HSTS, have to come from the host as headers. **Which host do you deploy to?** That decides where they go.
5. **Supply chain hardening.** The current risk to a frontend repo is malicious package releases (worms that publish poisoned versions), not CVEs.
   - **pnpm 9.0.0 → pnpm 10.**
     - Dependency install scripts are blocked by default (`onlyBuiltDependencies` allowlist; `@resvg/resvg-js` may need to be on it).
     - `minimumReleaseAge` (e.g. 1440 minutes) refuses versions published in the last 24h, which blocks most worm-style attacks.
   - **Pin GitHub Actions to commit SHAs.** `davelosert/vitest-coverage-report-action@v2` and `dorny/test-reporter@v1` are third-party, use mutable tags, and run in a job with `pull-requests: write` and `checks: write`.
   - **Remove `preinstall: npx only-allow pnpm`.** It downloads and runs a package from the registry on every install. The `packageManager` field plus Corepack already enforces pnpm.
   - **`release.yml` grants `id-token: write`** (an OIDC token for npm provenance), but the package is `private` and never published. Remove it (least privilege). The workflow also installs dependencies twice.
6. **One moderate vulnerability: `fflate` <0.7.5** (via `satori`), an infinite loop on malformed ZIP64. It is only used at build time on your own fonts, so it **can't be exploited** here. It still keeps `pnpm audit` red. Fix with `pnpm.overrides: { "fflate": ">=0.7.5" }`.

#### Low
7. If the `AboutMe` social `href`s ever come from content instead of constants, check that they use `https:`. Astro escapes attribute values but does not block `javascript:` URLs.
8. The inline theme script trusts `localStorage` as-is and throws when storage is blocked (e.g. Safari with storage disabled). Wrap it in `try` and accept only `'light' | 'dark'`.
9. `@nanostores/persistent` is in `devDependencies` but ships to the browser. It works because the site is static, but the classification is wrong. Under your own native-first rule, two libraries to persist one string can go: `localStorage` + a `change` listener is about 6 lines.

### Quality gates that claim more than they check
- `tsc --noEmit` **does not type-check `.astro` files**. "No `any`" inside components is not enforced. Use `astro check` (`@astrojs/check`) in pre-commit and CI.
- **Playwright e2e does not run in CI.** It also failed locally until today, because the tests still expected the removed CV link and missing trailing slashes.
- **Broken link:** `CookieDisclaimer.astro` → `href="/privacy-policy"` returns a 404 because of `trailingSlash: 'always'`. A link-check e2e test would catch this whole class of bug.
- **`Closes #30` on PR #30 links the PR to itself.** The traceability check passes with a meaningless value; it should point to the Story/Task issue.

### Documentation that misleads agents (why the other model keeps drifting)
Agents treat these docs as the truth, so every false claim here turns into a bug later:
- **`docs/ARCHITECTURE.md`** describes an `isMenuOpen` store that Header and NavigatorMenu subscribe to. It doesn't exist. Only one `src/pages` file appears in the diagram.
- **`header.spec.md` and `navigator-menu.spec.md`** describe the same nonexistent `isMenuOpen` store. `view-transitions.spec.md` still mentions `ClientRouter`/`<ViewTransitions>`.
- **Manifesto 09** contradicts the codebase:
  - It calls the app "SSR"; it is `output: static`.
  - It mandates `security.checkOrigin`, which only applies to on-demand rendered routes.
  - It requires server nonces, which a static site can't have.
  - It requires DOMPurify, which isn't installed and isn't needed.
  - Its `client:load` rules apply to framework islands, and there are none.
  - These rules can't be enforced, so agents learn that rules are optional.
- **The modernization plan sits in an old conversation's brain folder, not in the repo.** The other model couldn't find it, and nobody can version or review it. Move it to `docs/exec-plans/` (or GitHub Issues, since you have epic/story templates) and keep it in sync.

---

## Suggested order
1. Decide public repo vs Pro, then turn on branch protection with required checks. *(5 min, you)*
2. Fix the plan: delete Stories 1 and 3, replace Story 2 with the native `<dialog>` story, add BaseLayout, CSP and the generated sitemap. Move the plan into the repo.
3. Quick security PR: fflate override, SHA-pinned actions, drop `id-token`/`npx only-allow`, pnpm 10 + `minimumReleaseAge`, fix the privacy-policy link.
4. Rewrite manifesto 09 to match the static architecture. Fix ARCHITECTURE.md and the stale specs.
5. Add `astro check` and Playwright to CI.
6. Then Story 4.
