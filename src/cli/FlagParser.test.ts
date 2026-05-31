import { describe, it, expect } from "vitest";
import { FlagParser } from "@cli/FlagParser.js";

describe("FlagParser", () => {
  describe("boolean flags", () => {
    it("returns the default value for a flag that is not present in args", () => {
      const parser = new FlagParser({
        verbose: { type: "boolean", default: true, description: "Be verbose." },
      });
      expect(parser.parse([])).toEqual({ verbose: true });
    });

    it("returns true for a boolean flag that is present in args", () => {
      const parser = new FlagParser({
        verbose: { type: "boolean", default: true, description: "Be verbose." },
      });
      expect(parser.parse(["--verbose"])).toEqual({ verbose: true });
    });

    it("returns false as default for a boolean flag with false default", () => {
      const parser = new FlagParser({
        interactive: {
          type: "boolean",
          default: false,
          description: "Run interactively.",
        },
      });
      expect(parser.parse([])).toEqual({ interactive: false });
    });
  });

  describe("string flags", () => {
    it("returns the default value for a string flag that is not present in args", () => {
      const parser = new FlagParser({
        output: {
          type: "string",
          default: "stdout",
          description: "Where to write output.",
        },
      });
      expect(parser.parse([])).toEqual({ output: "stdout" });
    });

    it("returns the provided value for a string flag present in args", () => {
      const parser = new FlagParser({
        output: {
          type: "string",
          default: "stdout",
          description: "Where to write output.",
        },
      });
      expect(parser.parse(["--output", "file.txt"])).toEqual({
        output: "file.txt",
      });
    });
  });

  describe("multiple flags", () => {
    it("returns all defined flags when none are present in args", () => {
      const parser = new FlagParser({
        verbose: { type: "boolean", default: true, description: "Be verbose." },
        interactive: {
          type: "boolean",
          default: true,
          description: "Run interactively.",
        },
      });
      expect(parser.parse([])).toEqual({ verbose: true, interactive: true });
    });

    it("returns all defined flags when only some are present in args", () => {
      const parser = new FlagParser({
        verbose: { type: "boolean", default: true, description: "Be verbose." },
        interactive: {
          type: "boolean",
          default: false,
          description: "Run interactively.",
        },
      });
      expect(parser.parse(["--verbose"])).toEqual({
        verbose: true,
        interactive: false,
      });
    });

    it("handles mixed boolean and string flags", () => {
      const parser = new FlagParser({
        verbose: {
          type: "boolean",
          default: false,
          description: "Be verbose.",
        },
        output: {
          type: "string",
          default: "stdout",
          description: "Where to write output.",
        },
      });
      expect(parser.parse(["--verbose", "--output", "file.txt"])).toEqual({
        verbose: true,
        output: "file.txt",
      });
    });
  });

  it("silently ignores boolean-style unknown flags", () => {
    const parser = new FlagParser({
      verbose: { type: "boolean", default: false, description: "Be verbose." },
    });
    expect(parser.parse(["--unknown"])).toEqual({ verbose: false });
  });

  it("silently ignores string-style unknown flags and their values", () => {
    const parser = new FlagParser({
      verbose: { type: "boolean", default: false, description: "Be verbose." },
    });
    expect(parser.parse(["--unknown", "value"])).toEqual({ verbose: false });
  });

  it("keeps defined flags when unknown flags are also present", () => {
    const parser = new FlagParser({
      verbose: { type: "boolean", default: false, description: "Be verbose." },
    });
    expect(parser.parse(["--verbose", "--unknown"])).toEqual({ verbose: true });
  });

  describe("formatHelp", () => {
    it("lists every flag with its description", () => {
      const parser = new FlagParser({
        help: {
          type: "boolean",
          default: false,
          description: "Show this help message and exit.",
        },
        verbose: {
          type: "boolean",
          default: false,
          description: "Be verbose.",
        },
      });
      const help = parser.formatHelp();
      expect(help).toContain("--help");
      expect(help).toContain("Show this help message and exit.");
      expect(help).toContain("--verbose");
      expect(help).toContain("Be verbose.");
    });

    it("shows the placeholder for value-accepting string flags", () => {
      const parser = new FlagParser({
        license: {
          type: "string",
          default: "",
          description: "Pre-select a license.",
          placeholder: "<spdx-id>",
        },
      });
      expect(parser.formatHelp()).toContain("--license <spdx-id>");
    });

    it("falls back to a generic placeholder when none is given for a string flag", () => {
      const parser = new FlagParser({
        output: {
          type: "string",
          default: "stdout",
          description: "Where to write output.",
        },
      });
      expect(parser.formatHelp()).toContain("--output <value>");
    });

    it("does not append a value placeholder to boolean flags", () => {
      const parser = new FlagParser({
        verbose: {
          type: "boolean",
          default: false,
          description: "Be verbose.",
        },
      });
      expect(parser.formatHelp()).not.toContain("--verbose <");
    });

    it("aligns descriptions across flags of differing name lengths", () => {
      const parser = new FlagParser({
        h: { type: "boolean", default: false, description: "Short." },
        license: {
          type: "string",
          default: "",
          description: "Long one.",
          placeholder: "<spdx-id>",
        },
      });
      const columns = parser
        .formatHelp()
        .split("\n")
        .map((line) => line.lastIndexOf("  ") + 2);
      expect(new Set(columns).size).toBe(1);
    });
  });
});
