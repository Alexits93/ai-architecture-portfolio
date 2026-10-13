import js from "@eslint/js";
import tsEslint from "typescript-eslint";
import eslintPluginAstro from "eslint-plugin-astro";

// no-restricted-imports pattern for an import into one of `folders` through the `@/` alias or a `../` climb
// (https://eslint.org/docs/latest/rules/no-restricted-imports, ESLint 10.12.0).
const boundary = (folders, message) => ({ regex: `^(@/|(\\.\\./)+)(${folders})/`, message });

// Astro 7.3.8 deprecates `z` from astro:content (removed in Astro 8). A later block's options replace this one's
// (https://eslint.org/docs/latest/use/configure/rules), so every boundary block below repeats it.
const ASTRO_ZOD = { name: "astro:content", importNames: ["z"], message: "Import z from 'astro/zod' (deprecated in astro:content, removed in Astro 8)." };

// Type and markup bans in all source files.
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

// Specs: a missing value must fail the test at a guard, not flow on as undefined or a fallback (#138).
// ChainExpression is the root of every optional chain (https://github.com/estree/estree/blob/master/es2020.md).
const NULL_GUARD_MESSAGE = "Specs: no optional chaining or ?? fallbacks. Guard the value so a missing one fails the test and narrows the type: assert.exists or assert.instanceOf from vitest, or assert(value !== null) from node:assert/strict in Playwright specs.";
const EVALUATE_NODE_MESSAGE = "Specs: evaluate serializes its return value, so a DOM node arrives as a string. Read the values inside the callback, for example evaluate(() => ({ width: document.body.scrollWidth })).";
const NULL_SAFETY_BANS = [
  { "selector": "ChainExpression", "message": NULL_GUARD_MESSAGE },
  { "selector": "LogicalExpression[operator='??']", "message": NULL_GUARD_MESSAGE },
  { "selector": "AssignmentExpression[operator='??=']", "message": NULL_GUARD_MESSAGE },
  // page.evaluate serializes its result; a DOM node arrives as "ref: <Node>" and its properties read as undefined (#214).
  { "selector": "CallExpression[callee.property.name='evaluate'] > ArrowFunctionExpression > MemberExpression[object.name='document']", "message": EVALUATE_NODE_MESSAGE },
  { "selector": "CallExpression[callee.property.name='evaluate'] > ArrowFunctionExpression > CallExpression[callee.object.name='document']", "message": EVALUATE_NODE_MESSAGE },
  // Vitest has no content store: a route page (no `_` prefix) rendered in a spec reads empty collections, and checks pass
  // on markup that exists without data (#225, #226). `/` in a selector regex is escaped as `\/`
  // (https://eslint.org/docs/latest/extend/selectors); `:has()` is esquery syntax (https://github.com/estools/esquery).
  {
    "selector": "Program:has(ImportDeclaration[source.value=/^@\\/pages\\/(?:[^_\\/][^\\/]*\\/)*[^_\\/][^\\/]*\\.astro$/]):not(:has(CallExpression[callee.object.name='vi'][callee.property.name='mock'][arguments.0.value='astro:content']))",
    "message": "Specs: a route page rendered in Vitest reads empty collections (no content store). Mock astro:content with fixtures here, and check real entries in Playwright on the built page."
  }
];
const SPECS = ["**/*.spec.ts", "tests/**/*.ts", "e2e/**/*.ts"];

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
      "no-restricted-syntax": ["error", ...SYNTAX_BANS]
    }
  },
  {
    // A later block's options replace this rule's list (https://eslint.org/docs/latest/use/configure/rules).
    files: SPECS,
    rules: {
      "no-restricted-syntax": ["error", ...SYNTAX_BANS, ...NULL_SAFETY_BANS],
      "@typescript-eslint/no-non-null-assertion": "error"
    }
  },
  {
    // XSS: raw HTML injection is banned. SeoHead's JSON-LD (serializeJsonLd) is the single exception.
    files: ["**/*.astro"],
    ignores: ["src/components/SeoHead.astro"],
    rules: {
      "astro/no-set-html-directive": "error"
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
