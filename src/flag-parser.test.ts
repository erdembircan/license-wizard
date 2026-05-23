import { describe, it, expect } from "vitest";
import { FlagParser } from "./flag-parser.js";

describe("FlagParser", () => {
  describe("boolean flags", () => {
    it("returns the default value for a flag that is not present in args", () => {
      const parser = new FlagParser({ verbose: { type: "boolean", default: true } });
      expect(parser.parse([])).toEqual({ verbose: true });
    });

    it("returns true for a boolean flag that is present in args", () => {
      const parser = new FlagParser({ verbose: { type: "boolean", default: true } });
      expect(parser.parse(["--verbose"])).toEqual({ verbose: true });
    });

    it("returns false as default for a boolean flag with false default", () => {
      const parser = new FlagParser({ interactive: { type: "boolean", default: false } });
      expect(parser.parse([])).toEqual({ interactive: false });
    });
  });

  describe("string flags", () => {
    it("returns the default value for a string flag that is not present in args", () => {
      const parser = new FlagParser({ output: { type: "string", default: "stdout" } });
      expect(parser.parse([])).toEqual({ output: "stdout" });
    });

    it("returns the provided value for a string flag present in args", () => {
      const parser = new FlagParser({ output: { type: "string", default: "stdout" } });
      expect(parser.parse(["--output", "file.txt"])).toEqual({ output: "file.txt" });
    });
  });

  describe("multiple flags", () => {
    it("returns all defined flags when none are present in args", () => {
      const parser = new FlagParser({
        verbose: { type: "boolean", default: true },
        interactive: { type: "boolean", default: true },
      });
      expect(parser.parse([])).toEqual({ verbose: true, interactive: true });
    });

    it("returns all defined flags when only some are present in args", () => {
      const parser = new FlagParser({
        verbose: { type: "boolean", default: true },
        interactive: { type: "boolean", default: false },
      });
      expect(parser.parse(["--verbose"])).toEqual({
        verbose: true,
        interactive: false,
      });
    });

    it("handles mixed boolean and string flags", () => {
      const parser = new FlagParser({
        verbose: { type: "boolean", default: false },
        output: { type: "string", default: "stdout" },
      });
      expect(parser.parse(["--verbose", "--output", "file.txt"])).toEqual({
        verbose: true,
        output: "file.txt",
      });
    });
  });

  it("throws for flags not defined in the flag definitions", () => {
    const parser = new FlagParser({ verbose: { type: "boolean", default: true } });
    expect(() => parser.parse(["--unknown"])).toThrow();
  });
});
