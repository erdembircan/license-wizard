/*
 * SPDX-License-Identifier: Apache-2.0
 * SPDX-FileCopyrightText: 2026 Erdem Bircan
 * license-wizard managed-header v1 Apache-2.0 short 74d1a0534fa2
 */

import eslint from "@eslint/js";
import dotignore from "eslint-plugin-dotignore";
import pluginPrettier from "eslint-plugin-prettier/recommended";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist/**"] },
  {
    files: ["**/*.{js,ts}"],
    extends: [
      eslint.configs.recommended,
      tseslint.configs.recommended,
      pluginPrettier,
    ],
  },
  {
    files: ["**/*.ts"],
    languageOptions: {
      parserOptions: {
        projectService: true,
      },
    },
  },
  {
    files: ["**/*.js"],
    languageOptions: {
      globals: {
        process: "readonly",
      },
    },
  },
  dotignore.configs.strict,
);
