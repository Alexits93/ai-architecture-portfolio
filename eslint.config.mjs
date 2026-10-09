import js from "@eslint/js";
import tsEslint from "typescript-eslint";
import eslintPluginAstro from "eslint-plugin-astro";
import fsd from "@conarti/eslint-plugin-feature-sliced";

// AI-prose gate (CLAUDE.md writing rules), enforced in comments, strings and Astro template text.
// Emoji class matches .claude/hooks/anti-slop.mjs: Extended_Pictographic minus the (c), (R) and TM signs.
const BANNED_WORDS = ["delve", "robust", "seamless", "synergy", "tapestry", "cutting-edge", "leverage", "furthermore", "moreover", "ultimately", "in conclusion", "unlocking"];
const SLOP = `/\\b(${BANNED_WORDS.join("|")})\\b|\\u2014|(?![\\u00a9\\u00ae\\u2122])\\p{Extended_Pictographic}/iu`;
const SLOP_MESSAGE = "AI prose: banned word, em-dash or emoji (see CLAUDE.md writing rules).";

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
    "message": "Idiomatic Tooling (HTML5 State Law): Do not use dynamic inline styles (style={...}). Use Astro's <style define:vars={{...}}> instead."
  },
  {
    "selector": "JSXOpeningElement[name.name='script']:has(JSXNamespacedName[namespace.name='is'][name.name='inline']):not(:has(JSXAttribute[name.name='src'])):not(:has(JSXAttribute[name.name='type'][value.value='application/ld+json']))",
    "message": "CSP: inline is:inline scripts get no hash and a <meta> CSP does not cover content before it (W3C CSP3 3.3). Move the code to public/ and load it with <script is:inline src=\"/file.js\">."
  },
  {
    "selector": "JSXAttribute[name.name='class'] JSXExpressionContainer",
    "message": "Idiomatic Tooling (HTML5 State Law): Do not use dynamic class interpolation (class={...}). Use Astro's native class:list={...} directive instead."
  }
];

export default [
  js.configs.recommended,
  ...tsEslint.configs.recommended,
  ...eslintPluginAstro.configs.recommended,
  ...eslintPluginAstro.configs["jsx-a11y-strict"],
  fsd(),
  {
    ignores: ["dist/**", ".astro/**", "coverage/**", "playwright-report/**"]
  },
  {
    files: ["**/*.{ts,js,mjs,cjs,astro}"],
    rules: {
      "max-lines": ["error", 250],
      "max-lines-per-function": ["error", 25],
      "max-params": ["error", 3],
      "complexity": ["error", 5],
      "@typescript-eslint/no-explicit-any": "error",
      "no-warning-comments": ["error", { "terms": [...BANNED_WORDS, "—"], "location": "anywhere" }],
      "no-restricted-syntax": [
        "error",
        { "selector": `Literal[value=${SLOP}]`, "message": SLOP_MESSAGE },
        // cooked, not raw, so an escaped U+2014 in source is caught.
        { "selector": `TemplateElement[value.cooked=${SLOP}]`, "message": SLOP_MESSAGE },
        { "selector": `JSXText[value=${SLOP}]`, "message": SLOP_MESSAGE },
        // HTML comments and <style> or <script is:inline> bodies (https://github.com/ota-meshi/astro-eslint-parser/blob/main/docs/AST.md).
        { "selector": `AstroHTMLComment[value=${SLOP}]`, "message": SLOP_MESSAGE },
        { "selector": `AstroRawText[value=${SLOP}]`, "message": SLOP_MESSAGE },
        ...SYNTAX_BANS
      ]
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
    files: ["eslint.config.mjs", ".claude/hooks/anti-slop.mjs", "tests/architecture/claude-hooks.spec.ts", "tests/config/eslint.spec.ts"],
    rules: {
      "no-warning-comments": "off",
      "no-restricted-syntax": ["error", ...SYNTAX_BANS]
    }
  },
  {
    // Classic browser scripts served as-is from public/ (outside Astro's bundler).
    files: ["public/**/*.js"],
    languageOptions: {
      sourceType: "script",
      globals: { document: "readonly", localStorage: "readonly" }
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
    // Astro pages are handled dynamically by the framework, FSD public API doesn't apply
    files: ["src/pages/**", "eslint.config.mjs"],
    rules: {
      "@conarti/feature-sliced/public-api": "off",
      "@conarti/feature-sliced/import-order": "off"
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
