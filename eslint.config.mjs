import { defaultConfig } from "@caido/eslint-config";

/** @type {import('eslint').Linter.Config } */
export default [
  ...defaultConfig(),
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/ban-ts-comment": "off",
      "@typescript-eslint/strict-boolean-expressions": "off",
      "@typescript-eslint/no-restricted-types": "off",
      "@typescript-eslint/restrict-plus-operands": "off",
      "compat/compat": "off",
      "compat": "off"
    }
  }
]
