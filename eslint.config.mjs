import js from "@eslint/js";
import tsEslint from "typescript-eslint";
import eslintPluginAstro from "eslint-plugin-astro";
import fsd from "@conarti/eslint-plugin-feature-sliced";

export default [
  js.configs.recommended,
  ...tsEslint.configs.recommended,
  ...eslintPluginAstro.configs.recommended,
  ...eslintPluginAstro.configs["jsx-a11y-strict"],
  fsd(),
  {
    ignores: [".agents/**", "dist/**", ".astro/**"]
  },
  {
    files: ["**/*.{ts,js,mjs,cjs,astro}"],
    rules: {
      "max-lines": ["error", 250],
      "max-lines-per-function": ["error", 25],
      "max-params": ["error", 3],
      "complexity": ["error", 5],
      "@typescript-eslint/no-explicit-any": "error",
      "no-restricted-syntax": [
        "error",
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
          "selector": "JSXAttribute[name.name='class'] JSXExpressionContainer",
          "message": "Idiomatic Tooling (HTML5 State Law): Do not use dynamic class interpolation (class={...}). Use Astro's native class:list={...} directive instead."
        }
      ]
    }
  },
  {
    // Astro pages are handled dynamically by the framework, FSD public API doesn't apply
    files: ["src/pages/**/*.astro", "eslint.config.mjs"],
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
