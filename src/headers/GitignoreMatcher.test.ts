import { describe, it, expect } from "vitest";
import {
  DEFAULT_IGNORES,
  GitignoreMatcher,
} from "@headers/GitignoreMatcher.js";

describe("GitignoreMatcher", () => {
  it("ignores the default dependency and VCS directories", () => {
    const matcher = new GitignoreMatcher(DEFAULT_IGNORES);

    expect(matcher.ignores("node_modules", true)).toBe(true);
    expect(matcher.ignores("node_modules/pkg/index.js", false)).toBe(true);
    expect(matcher.ignores("vendor/autoload.php", false)).toBe(true);
    expect(matcher.ignores(".git/config", false)).toBe(true);
    expect(matcher.ignores("src/index.ts", false)).toBe(false);
  });

  it("skips comments and blank lines", () => {
    const matcher = new GitignoreMatcher(["# a comment", "", "dist"]);

    expect(matcher.ignores("dist/bundle.js", false)).toBe(true);
    expect(matcher.ignores("src/a.ts", false)).toBe(false);
  });

  it("matches an unanchored name at any depth", () => {
    const matcher = new GitignoreMatcher(["build"]);

    expect(matcher.ignores("build", true)).toBe(true);
    expect(matcher.ignores("packages/app/build/out.js", false)).toBe(true);
  });

  it("anchors a pattern that contains a slash to the root", () => {
    const matcher = new GitignoreMatcher(["/dist"]);

    expect(matcher.ignores("dist/a.js", false)).toBe(true);
    expect(matcher.ignores("src/dist/a.js", false)).toBe(false);
  });

  it("honours a directory-only pattern for directories, not files", () => {
    const matcher = new GitignoreMatcher(["logs/"]);

    expect(matcher.ignores("logs", true)).toBe(true);
    expect(matcher.ignores("logs", false)).toBe(false);
  });

  it("supports a single-segment wildcard", () => {
    const matcher = new GitignoreMatcher(["*.min.js"]);

    expect(matcher.ignores("dist/app.min.js", false)).toBe(true);
    expect(matcher.ignores("dist/app.js", false)).toBe(false);
  });

  it("lets a later negation re-include a path", () => {
    const matcher = new GitignoreMatcher(["dist", "!dist/keep.js"]);

    expect(matcher.ignores("dist/drop.js", false)).toBe(true);
    expect(matcher.ignores("dist/keep.js", false)).toBe(false);
  });
});
