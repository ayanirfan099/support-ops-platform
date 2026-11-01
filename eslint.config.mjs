import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTypescript,
  {
    rules: {
      // This Pages Router rule is not applicable to this App Router-only app.
      "@next/next/no-html-link-for-pages": "off",
    },
  },
  globalIgnores([
    ".next/**",
    "node_modules/**",
    "coverage/**",
    "packages/database/prisma/migrations/**",
    "next-env.d.ts",
  ]),
]);
