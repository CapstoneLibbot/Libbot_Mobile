const expoConfig = require("eslint-config-expo/flat");

module.exports = [
  ...expoConfig,
  {
    ignores: ["node_modules/**", ".expo/**", "dist/**", "build/**"],
  },
  {
    files: ["src/shared/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "@/core/**",
                "@/platform/**",
                "@/features/**",
                "@/testing/**",
              ],
              message:
                "src/shared must remain strictly domain-neutral and cannot import from core, platform, features, or testing.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/platform/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "@/features/**",
                "@/testing/**",
              ],
              message:
                "src/platform cannot import from features or testing.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/**/*.{ts,tsx}", "app/**/*.{ts,tsx}"],
    ignores: [
      "**/__tests__/**",
      "**/*.test.{ts,tsx}",
      "src/testing/**",
      "src/core/composition/**",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/testing/**", "**/testing/**"],
              message:
                "Production code must not import from testing fixtures or test helpers.",
            },
          ],
        },
      ],
    },
  },
];

