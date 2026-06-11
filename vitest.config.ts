/*
 * SPDX-License-Identifier: Apache-2.0
 * SPDX-FileCopyrightText: 2026 Erdem Bircan
 * license-wizard managed-header v1 Apache-2.0 short 74d1a0534fa2
 */

import { defineConfig, configDefaults } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    // Keep the default ignores but also skip `.claude/` — git worktrees are
    // parked under `.claude/worktrees/` (e.g. the gh-pages app), and without
    // this a root-level `pnpm test` would walk into them and run another
    // project's suite under the wrong environment. CI is unaffected (it tests a
    // clean checkout with no worktrees); this only scopes local runs.
    exclude: [...configDefaults.exclude, "**/.claude/**"],
  },
  resolve: {
    alias: {
      "@application": path.resolve(__dirname, "src/application"),
      "@cli": path.resolve(__dirname, "src/cli"),
      "@licensing": path.resolve(__dirname, "src/licensing"),
      "@configuration": path.resolve(__dirname, "src/configuration"),
      "@headers": path.resolve(__dirname, "src/headers"),
    },
  },
});
