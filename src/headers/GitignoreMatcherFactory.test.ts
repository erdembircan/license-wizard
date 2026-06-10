/*
 * SPDX-License-Identifier: Apache-2.0
 * SPDX-FileCopyrightText: 2026 Erdem Bircan
 * license-wizard managed-header v1 Apache-2.0 short 74d1a0534fa2
 */

import { describe, it, expect } from "vitest";
import { DEFAULT_IGNORES } from "@headers/GitignoreMatcher.js";
import { GitignoreMatcherFactory } from "@headers/GitignoreMatcherFactory.js";

describe("GitignoreMatcherFactory", () => {
  it("builds a matcher from .gitignore text with extra defaults applied first", () => {
    const matcher = new GitignoreMatcherFactory().fromContent(
      "coverage\n",
      DEFAULT_IGNORES,
    );

    expect(matcher.ignores("node_modules/x.js", false)).toBe(true);
    expect(matcher.ignores("coverage/report.js", false)).toBe(true);
    expect(matcher.ignores("src/a.ts", false)).toBe(false);
  });

  it("builds a matcher from text alone when no extra patterns are given", () => {
    const matcher = new GitignoreMatcherFactory().fromContent("dist\n");

    expect(matcher.ignores("dist/bundle.js", false)).toBe(true);
    expect(matcher.ignores("src/a.ts", false)).toBe(false);
  });
});
