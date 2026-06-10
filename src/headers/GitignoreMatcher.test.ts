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

  it("matches a leading double-star pattern at the root and any depth", () => {
    const matcher = new GitignoreMatcher(["**/dist"]);

    // `**/dist` must match a root-level `dist` too, not only a nested one.
    expect(matcher.ignores("dist", true)).toBe(true);
    expect(matcher.ignores("dist/out.js", false)).toBe(true);
    expect(matcher.ignores("packages/app/dist/out.js", false)).toBe(true);
    expect(matcher.ignores("src/index.ts", false)).toBe(false);
  });

  it("treats a double star between slashes as zero or more directories", () => {
    const matcher = new GitignoreMatcher(["a/**/b"]);

    // Zero intervening directories must match.
    expect(matcher.ignores("a/b", false)).toBe(true);
    expect(matcher.ignores("a/x/b", false)).toBe(true);
    expect(matcher.ignores("a/x/y/b", false)).toBe(true);
    expect(matcher.ignores("a/c", false)).toBe(false);
  });

  it("matches everything beneath a trailing double star", () => {
    const matcher = new GitignoreMatcher(["build/**"]);

    expect(matcher.ignores("build/out.js", false)).toBe(true);
    expect(matcher.ignores("build/nested/out.js", false)).toBe(true);
    expect(matcher.ignores("src/build.js", false)).toBe(false);
  });

  it("honours a character class", () => {
    const matcher = new GitignoreMatcher(["[Bb]uild/"]);

    // A `[Bb]uild/` class must match either case, not be escaped to a literal.
    expect(matcher.ignores("Build", true)).toBe(true);
    expect(matcher.ignores("build", true)).toBe(true);
    expect(matcher.ignores("build/out.js", false)).toBe(true);
    expect(matcher.ignores("cuild", true)).toBe(false);
  });

  it("supports a negated character class", () => {
    const matcher = new GitignoreMatcher(["foo[!0-9].js"]);

    expect(matcher.ignores("fooa.js", false)).toBe(true);
    expect(matcher.ignores("foo1.js", false)).toBe(false);
  });
});
