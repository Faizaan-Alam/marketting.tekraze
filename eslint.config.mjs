import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier";

const config = [
  ...nextVitals,
  ...nextTs,
  prettier,
  {
    ignores: [
      ".next/**",
      "out/**",
      "node_modules/**",
      "webapps/**",
      "public/**",
      "src/generated/**",
      "playwright-report/**",
      "test-results/**",
      "next-env.d.ts",
    ],
  },
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/consistent-type-definitions": ["error", "type"],
      "react/no-danger": "error",
      "no-eval": "error",
      "no-implied-eval": "error",
      "no-new-func": "error",
      "no-restricted-imports": [
        "error",
        {
          paths: [
            { name: "zod", message: 'Import { z } from "@/lib/zod" (CSP-safe, jitless config).' },
          ],
        },
      ],
      "no-restricted-syntax": [
        "error",
        {
          selector: "NewExpression[callee.name='RegExp']",
          message: "Do not build RegExps at runtime (user input must never become a pattern).",
        },
      ],
    },
  },
  {
    files: ["src/lib/zod.ts", "scripts/**/*.mjs"],
    rules: { "no-restricted-imports": "off" },
  },
  {
    files: ["scripts/**/*.mjs"],
    rules: { "no-console": "off" },
  },
];

export default config;
