import { describe, it, expect } from "vitest";
import { buildBanner } from "@cli/Banner.js";

const META = {
  name: "license wizard",
  description: "An interactive CLI for generating license files",
  version: "1.0.0-dev",
};

// ANSI escape sequences begin with the ESC control character (code 27).
const ESC = String.fromCharCode(27);

describe("buildBanner", () => {
  it("includes the name, description, and v-prefixed version", () => {
    const banner = buildBanner(META);

    expect(banner).toContain("license wizard");
    expect(banner).toContain("An interactive CLI for generating license files");
    expect(banner).toContain("v1.0.0-dev");
  });

  it("prefixes the header with the wizard glyph", () => {
    expect(buildBanner(META)).toContain("🧙");
  });

  it("renders three lines", () => {
    expect(buildBanner(META).split("\n")).toHaveLength(3);
  });

  it("applies ANSI styling by default", () => {
    expect(buildBanner(META).includes(ESC)).toBe(true);
  });

  it("emits plain text with no ANSI styling when color is disabled", () => {
    const banner = buildBanner(META, { color: false });

    expect(banner.includes(ESC)).toBe(false);
    expect(banner).toContain("🧙");
    expect(banner).toContain("license wizard");
    expect(banner).toContain("An interactive CLI for generating license files");
    expect(banner).toContain("v1.0.0-dev");
  });

  it("displays the name verbatim next to the glyph", () => {
    expect(
      buildBanner({ ...META, name: "license wizard" }, { color: false }),
    ).toContain("🧙  license wizard");
  });
});
