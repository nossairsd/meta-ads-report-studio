import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Prisma writes this; it is a build artefact carrying its own
    // @ts-nocheck, and linting it produces thousands of irrelevant findings.
    "generated/**",
  ]),
  {
    rules: {
      // A leading underscore is the conventional way to say "this parameter
      // exists to satisfy a signature and is not meant to be used" — a mock
      // whose call tuple must be typed, for instance. Without this the
      // convention still warns, which trains people to ignore warnings.
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
]);

export default eslintConfig;
