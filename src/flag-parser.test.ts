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

  it("returns false when a boolean flag is negated with --no- prefix", () => {
    const parser = new FlagParser({ verbose: { default: true } });
    expect(parser.parse(["--no-verbose"])).toEqual({ verbose: false });
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
      interactive: { default: true },
    });
    expect(parser.parse(["--no-interactive"])).toEqual({
      verbose: true,
      interactive: false,
    });
  });

  it("handles multiple flags toggled in a single parse call", () => {
    const parser = new FlagParser({
      verbose: { default: true },
      interactive: { default: true },
      dry: { default: true },
    });
    expect(parser.parse(["--no-verbose", "--no-dry"])).toEqual({
      verbose: false,
      interactive: true,
      dry: false,
    });
  });

  it("ignores extra flags not defined in the flag definitions", () => {
    const parser = new FlagParser({ verbose: { default: true } });
    expect(() => parser.parse(["--unknown"])).toThrow();
  });
});
