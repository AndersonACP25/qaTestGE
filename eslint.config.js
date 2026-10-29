import hooks from "eslint-plugin-react-hooks";
import pluralization from "./eslint-rules/pluralization.js";
import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/node_modules/**",
      "**/coverage/**",
      "playwright-report/**",
      "test-results/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
    },
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: { globals: globals.browser },
    plugins: { "react-hooks": hooks, product: { rules: { pluralization } } },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "error",
      "product/pluralization": "error",
    },
  },
  { files: ["backend/**/*.{ts,js}", "*.{js,ts}"], languageOptions: { globals: globals.node } },
  {
    files: ["tests/**/*.ts", "backend/tests/**/*.ts"],
    languageOptions: { globals: { ...globals.node, ...globals.browser, ...globals.vitest } },
  },
  {
    files: ["src/**/*.{ts,tsx}", "backend/src/**/*.ts"],
    languageOptions: { parserOptions: { projectService: true } },
    rules: {
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": "error",
    },
  },
);
