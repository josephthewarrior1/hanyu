import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
export default defineConfig([
  ...nextVitals,
  ...nextTs,
  { rules: { "react-hooks/set-state-in-effect": "off" } },
  // Android assets are local files; Next's server image optimizer is unavailable.
  { files: ["android/web/**/*.tsx"], rules: { "@next/next/no-img-element": "off" } },
  globalIgnores([
    ".next/**",
    "node_modules/**",
    "next-env.d.ts",
    "test-results/**",
    "playwright-report/**",
    "android/.gradle/**",
    "android/**/build/**",
    "android/app/src/main/assets/**",
  ]),
]);
