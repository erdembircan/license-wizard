import { describe, it, expect } from "vitest";
import { FlagParser } from "./flag-parser.js";

describe("FlagParser", () => {
  it("returns the default value for a flag that is not present in args", () => {
    const parser = new FlagParser({ verbose: { default: true } });
    expect(parser.parse([])).toEqual({ verbose: true });
  });

  it("returns true for a boolean flag that is present in args", () => {
    const parser = new FlagParser({ verbose: { default: true } });
    expect(parser.parse(["--verbose"])).toEqual({ verbose: true });
  });

  it("returns all defined flags when none are present in args", () => {
    const parser = new FlagParser({
      verbose: { default: true },
      interactive: { default: true },
    });
    expect(parser.parse([])).toEqual({ verbose: true, interactive: true });
  });

  it("returns all defined flags when only some are present in args", () => {
    const parser = new FlagParser({
      verbose: { default: true },
      interactive: { default: false },
    });
    expect(parser.parse(["--verbose"])).toEqual({
      verbose: true,
      interactive: false,
    });
  });

  it("throws for flags not defined in the flag definitions", () => {
    const parser = new FlagParser({ verbose: { default: true } });
    expect(() => parser.parse(["--unknown"])).toThrow();
  });
});
