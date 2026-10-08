# DevSpec: CV Page (`pages/cv.astro`)

This matrix dictates the Test-Driven Development (TDD) parameters and constraints for the CV page implementation.

## 1. Security (OWASP XSS Prevention)
- **Static Content:** All CV text and tags are hardcoded statically in the Astro template. 
- **No `set:html`:** The component will strictly use standard Astro syntax. `set:html` is strictly forbidden to prevent XSS.
- **Link Trust:** The PDF download link points to `/assets/files/patri-alexits-cv.pdf` (a relative, same-origin path), satisfying the origin-checking security standard.

## 2. Performance (Web Vitals)
- **Zero JavaScript:** This page has no interactive widgets other than the global Header/Navigator. Therefore, NO `<script>` tags or `client:load` directives will be used.
- **CLS Prevention:** The sidebar and main content layout must utilize native CSS Flexbox/Grid to ensure the layout is deterministic before the first paint. No layout reflows.
- **LCP Optimization:** The page is fully static and SSR generated. LCP is driven entirely by HTML delivery speed and CSS rendering.

## 3. Maintainability (FSD Compliance)
- **Layering:** It sits at the top FSD layer (`pages`).
- **Imports:** 
  - Valid: `import AboutMe from '@/widgets/about-me/ui/AboutMe.astro';`
  - Valid: `import SkillTag from '@/shared/ui/skill-tag/SkillTag.astro';`
  - Valid: `import Header from '@/widgets/header/ui/Header.astro';`
- Cross-imports upward are avoided.

## 4. Test-Driven Implementation Strategy
Since Playwright handles page-level routing and layout composition, we will write a Playwright E2E test to verify the route `/cv`.

1. **Test Location:** `e2e/cv.spec.ts`
2. **Assertions:**
   - Navigating to `/cv` returns a `200` status.
   - The page contains the `Header` and `AboutMe` components.
   - The `.cv-wrapper` exists and contains `.experience-item` articles.
   - The download link exists with `href="/assets/files/patri-alexits-cv.pdf"` and `download` attribute.
