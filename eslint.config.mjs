import js from "@eslint/js";
import tsEslint from "typescript-eslint";
import eslintPluginAstro from "eslint-plugin-astro";

// AI-prose gate (CLAUDE.md writing rules), enforced in comments, strings and Astro template text.
// Emoji class matches .claude/hooks/anti-slop.mjs: Extended_Pictographic minus the (c), (R) and TM signs.
const BANNED_WORDS = ["delve", "robust", "seamless", "synergy", "tapestry", "cutting-edge", "leverage", "furthermore", "moreover", "ultimately", "in conclusion", "unlocking"];
const SLOP = `/\\b(${BANNED_WORDS.join("|")})\\b|\\u2014|(?![\\u00a9\\u00ae\\u2122])\\p{Extended_Pictographic}/iu`;
const SLOP_MESSAGE = "AI prose: banned word, em-dash or emoji (see CLAUDE.md writing rules).";

// no-restricted-imports pattern for an import into one of `folders` through the `@/` alias or a `../` climb
// (https://eslint.org/docs/latest/rules/no-restricted-imports, ESLint 10.12.0).
const boundary = (folders, message) => ({ regex: `^(@/|(\\.\\./)+)(${folders})/`, message });

// Astro 7.3.8 deprecates `z` from astro:content (removed in Astro 8). A later block's options replace this one's
// (https://eslint.org/docs/latest/use/configure/rules), so every boundary block below repeats it.
const ASTRO_ZOD = { name: "astro:content", importNames: ["z"], message: "Import z from 'astro/zod' (deprecated in astro:content, removed in Astro 8)." };

// Type and markup bans, kept apart from the prose selectors so the prose exemption below keeps them.
const SYNTAX_BANS = [
  {
    "selector": "TSUnknownKeyword",
    "message": "The 'unknown' type is banned. Define explicit types or interfaces."
  },
  {
    "selector": "TSAsExpression[typeAnnotation.type='TSUnknownKeyword']",
    "message": "Type assertion 'as unknown' is strictly banned. Validate data instead of forcing casts."
  },
  {
    "selector": "JSXAttribute[name.name='style'] JSXExpressionContainer",
    "message": "Idiomatic Tooling (HTML5 State Law): Do not use dynamic inline styles (style={...}). The hashed CSP blocks style attributes, including those <style define:vars> renders. Toggle a class (class:list) or a data-* attribute and style it in a scoped <style>."
  },
  {
    "selector": "JSXOpeningElement[name.name='script']:has(JSXNamespacedName[namespace.name='is'][name.name='inline']):not(:has(JSXAttribute[name.name='src'])):not(:has(JSXAttribute[name.name='type'][value.value='application/ld+json']))",
    "message": "CSP: inline is:inline scripts get no hash and a <meta> CSP does not cover content before it (W3C CSP3 3.3). For a pre-paint script, inject it with injectScript('head-inline') in astro.config.mjs, which Astro hashes, as src/lib/theme.js is."
  },
  {
    "selector": "JSXAttribute[name.name='class'] JSXExpressionContainer",
    "message": "Idiomatic Tooling (HTML5 State Law): Do not use dynamic class interpolation (class={...}). Use Astro's native class:list={...} directive instead."
  }
];

const PROSE_BANS = [
  { "selector": `Literal[value=${SLOP}]`, "message": SLOP_MESSAGE },
  // cooked, not raw, so an escaped U+2014 in source is caught.
  { "selector": `TemplateElement[value.cooked=${SLOP}]`, "message": SLOP_MESSAGE },
  { "selector": `JSXText[value=${SLOP}]`, "message": SLOP_MESSAGE },
  // HTML comments and <style> or <script is:inline> bodies (https://github.com/ota-meshi/astro-eslint-parser/blob/main/docs/AST.md).
  { "selector": `AstroHTMLComment[value=${SLOP}]`, "message": SLOP_MESSAGE },
  { "selector": `AstroRawText[value=${SLOP}]`, "message": SLOP_MESSAGE }
];

// Specs: a missing value must fail the test at a guard, not flow on as undefined or a fallback (#138).
// ChainExpression is the root of every optional chain (https://github.com/estree/estree/blob/master/es2020.md).
const NULL_GUARD_MESSAGE = "Specs: no optional chaining or ?? fallbacks. Guard the value so a missing one fails the test and narrows the type: assert.exists or assert.instanceOf from vitest, or assert(value !== null) from node:assert/strict in Playwright specs.";
const NULL_SAFETY_BANS = [
  { "selector": "ChainExpression", "message": NULL_GUARD_MESSAGE },
  { "selector": "LogicalExpression[operator='??']", "message": NULL_GUARD_MESSAGE },
  { "selector": "AssignmentExpression[operator='??=']", "message": NULL_GUARD_MESSAGE }
];
const SPECS = ["**/*.spec.ts", "tests/**/*.ts", "e2e/**/*.ts"];
const PROSE_EXEMPT_SPECS = ["tests/architecture/claude-hooks.spec.ts", "tests/config/eslint.spec.ts"];

export default [
  js.configs.recommended,
  ...tsEslint.configs.recommended,
  ...eslintPluginAstro.configs.recommended,
  ...eslintPluginAstro.configs["jsx-a11y-strict"],
  {
    ignores: ["dist/**", ".astro/**", "coverage/**", "playwright-report/**"]
  },
  {
    // Inline eslint-disable and rule comments cannot switch a gate off.
    linterOptions: { noInlineConfig: true }
  },
  {
    files: ["**/*.{ts,js,mjs,cjs,astro}"],
    rules: {
      "max-lines": ["error", 250],
      "max-lines-per-function": ["error", 25],
      "max-params": ["error", 3],
      "complexity": ["error", 5],
      "@typescript-eslint/no-explicit-any": "error",
      // Every `as` cast except `as const`: narrow with instanceof or typed generics instead.
      "@typescript-eslint/consistent-type-assertions": ["error", { "assertionStyle": "never" }],
      "no-console": "error",
      "no-warning-comments": ["error", { "terms": [...BANNED_WORDS, "—"], "location": "anywhere" }],
      "no-restricted-syntax": ["error", ...PROSE_BANS, ...SYNTAX_BANS]
    }
  },
  {
    // A later block's options replace this rule's list (https://eslint.org/docs/latest/use/configure/rules).
    files: SPECS,
    rules: {
      "no-restricted-syntax": ["error", ...PROSE_BANS, ...SYNTAX_BANS, ...NULL_SAFETY_BANS],
      "@typescript-eslint/no-non-null-assertion": "error"
    }
  },
  {
    // XSS: raw HTML injection is banned. SeoHead's JSON-LD (serializeJsonLd) is the single exception.
    files: ["**/*.astro"],
    ignores: ["src/shared/ui/seo-head/SeoHead.astro"],
    rules: {
      "astro/no-set-html-directive": "error"
    }
  },
  {
    // These files must spell out the banned list or slop samples to test the gates.
    files: ["eslint.config.mjs", ".claude/hooks/anti-slop.mjs"],
    rules: {
      "no-warning-comments": "off",
      "no-restricted-syntax": ["error", ...SYNTAX_BANS]
    }
  },
  {
    files: PROSE_EXEMPT_SPECS,
    rules: {
      "no-warning-comments": "off",
      "no-restricted-syntax": ["error", ...SYNTAX_BANS, ...NULL_SAFETY_BANS]
    }
  },
  {
    // Classic browser script outside Astro's bundler, injected inline by astro.config.mjs.
    files: ["src/lib/theme.js"],
    languageOptions: {
      sourceType: "script",
      globals: { document: "readonly", localStorage: "readonly" }
    }
  },
  {
    // The card-to-post morph, also a classic inline <head> script injected by astro.config.mjs (#210).
    files: ["src/lib/post-morph.js"],
    languageOptions: {
      sourceType: "script",
      globals: {
        addEventListener: "readonly",
        document: "readonly",
        matchMedia: "readonly",
        navigation: "readonly",
        URL: "readonly"
      }
    }
  },
  {
    // Claude Code hook scripts run directly in Node.
    files: [".claude/hooks/**/*.mjs"],
    languageOptions: {
      globals: { process: "readonly" }
    }
  },
  {
    files: ["src/**"],
    rules: {
      "no-restricted-imports": ["error", { paths: [ASTRO_ZOD] }]
    }
  },
  // Import boundaries (ADR 002): pages > layouts > components > lib. Matches `@/` and `../` specifiers.
  {
    files: ["src/layouts/**"],
    rules: {
      "no-restricted-imports": ["error", { paths: [ASTRO_ZOD], patterns: [boundary("pages", "Layouts must not import pages (ADR 002).")] }]
    }
  },
  {
    files: ["src/components/**"],
    rules: {
      "no-restricted-imports": ["error", { paths: [ASTRO_ZOD], patterns: [boundary("pages|layouts", "Components must not import pages or layouts (ADR 002).")] }]
    }
  },
  {
    files: ["src/lib/**"],
    rules: {
      "no-restricted-imports": ["error", {
        paths: [ASTRO_ZOD],
        patterns: [
          boundary("pages|layouts|components", "lib must not import pages, layouts or components (ADR 002)."),
          { regex: "\\.astro$", message: "lib is framework-free TypeScript and must not import .astro files (ADR 002)." }
        ]
      }]
    }
  },
  {
    files: ["**/*.spec.ts", "tests/**/*.ts"],
    rules: {
      "max-lines-per-function": ["error", 50],
      "complexity": ["error", 10]
    }
  }
];
