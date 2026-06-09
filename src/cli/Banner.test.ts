import { describe, it, expect } from "vitest";
import { buildAgentHint, buildBanner } from "@cli/Banner.js";

// Arbitrary metadata: the banner must relay whatever it is given, not any
// particular application's values.
const META = {
  name: "acme tool",
  description: "does useful things",
  version: "2.3.4",
};

// ANSI escape sequences begin with the ESC control character (code 27).
const ESC = String.fromCharCode(27);

describe("buildBanner", () => {
  it("relays the provided name, description, and version into the output", () => {
    const banner = buildBanner(META, { color: false });

    expect(banner).toContain(META.name);
    expect(banner).toContain(META.description);
    expect(banner).toContain(META.version);
  });

  it("emits no ANSI styling when color is disabled", () => {
    expect(buildBanner(META, { color: false }).includes(ESC)).toBe(false);
  });

  it("emits ANSI styling when color is enabled", () => {
    expect(buildBanner(META, { color: true }).includes(ESC)).toBe(true);
  });

  it("still conveys the same metadata when colored", () => {
    const colored = buildBanner(META, { color: true });

    expect(colored).toContain(META.name);
    expect(colored).toContain(META.description);
    expect(colored).toContain(META.version);
    expect(colored).not.toBe(buildBanner(META, { color: false }));
  });
});

describe("buildAgentHint", () => {
  it("steers automated callers toward the non-interactive flags", () => {
    const hint = buildAgentHint({ color: false });

    expect(hint.toLowerCase()).toContain("non-interactive");
  });

  it("links to the published plain-Markdown docs", () => {
    expect(buildAgentHint({ color: false })).toContain(
      "https://erdembircan.github.io/license-wizard/documentation.md",
    );
  });

  it("emits no ANSI styling when color is disabled", () => {
    expect(buildAgentHint({ color: false }).includes(ESC)).toBe(false);
  });

  it("emits ANSI styling when color is enabled", () => {
    expect(buildAgentHint({ color: true }).includes(ESC)).toBe(true);
  });
});
