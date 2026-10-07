import tsEslint from "typescript-eslint";
import js from "@eslint/js";
import eslintPluginAstro from "eslint-plugin-astro";

export default [
  js.configs.recommended,
  ...tsEslint.configs.recommended,
  ...eslintPluginAstro.configs.recommended,
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
        }
      ]
    }
  }
];
