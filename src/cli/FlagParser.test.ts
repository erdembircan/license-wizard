import { describe, it, expect } from "vitest";
import { FlagParser } from "@cli/FlagParser.js";

const SELECTION_FLAGS = {
  license: { type: "string" as const, default: "", description: "License." },
  set: { type: "list" as const, default: [] as string[], description: "Set." },
  "save-rc": {
    type: "boolean" as const,
    default: false,
    description: "Save.",
  },
};

describe("FlagParser", () => {
  describe("value coercion", () => {
    it("drops a value-less string flag to its default rather than a boolean", () => {
      const parser = new FlagParser(SELECTION_FLAGS);
      // `--license` with no value parses (non-strict) as boolean true; coercion
      // keeps the resolved value a string so callers never crash on it.
      expect(parser.parse(["--license"]).license).toBe("");
    });

    it("drops a value-less list element rather than collecting a boolean", () => {
      const parser = new FlagParser(SELECTION_FLAGS);
      expect(parser.parse(["--license", "MIT", "--set"]).set).toEqual([]);
    });
  });

  describe("validate", () => {
    it("reports an unknown flag", () => {
      const parser = new FlagParser(SELECTION_FLAGS);
      const errors = parser.validate(["--licens", "MIT"]);
      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain("Unknown flag: --licens");
    });

    it("reports each unknown flag once", () => {
      const parser = new FlagParser(SELECTION_FLAGS);
      expect(parser.validate(["--nope", "--nope"])).toHaveLength(1);
    });

    it("reports a value-accepting flag given with no value", () => {
      const parser = new FlagParser(SELECTION_FLAGS);
      expect(parser.validate(["--license"])[0]).toBe(
        "The --license flag requires a value.",
      );
    });

    it("reports a value flag that swallowed the following flag", () => {
      const parser = new FlagParser(SELECTION_FLAGS);
      const errors = parser.validate(["--license", "--save-rc"]);
      expect(errors[0]).toContain("looks like another flag");
    });

    it("accepts well-formed arguments", () => {
      const parser = new FlagParser(SELECTION_FLAGS);
      expect(parser.validate(["--license", "MIT", "--save-rc"])).toEqual([]);
    });

    it("accepts an inline value", () => {
      const parser = new FlagParser(SELECTION_FLAGS);
      expect(parser.validate(["--license=MIT"])).toEqual([]);
    });
  });
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

  describe("list flags", () => {
    it("returns an empty array for a list flag that is not present in args", () => {
      const parser = new FlagParser({
        set: {
          type: "list",
          default: [],
          description: "Set a field.",
          placeholder: "<field=value>",
        },
      });
      expect(parser.parse([])).toEqual({ set: [] });
    });

    it("collects a single occurrence into a one-element array", () => {
      const parser = new FlagParser({
        set: {
          type: "list",
          default: [],
          description: "Set a field.",
        },
      });
      expect(parser.parse(["--set", "year=2026"])).toEqual({
        set: ["year=2026"],
      });
    });

    it("collects every occurrence of a repeated list flag in order", () => {
      const parser = new FlagParser({
        set: {
          type: "list",
          default: [],
          description: "Set a field.",
        },
      });
      expect(
        parser.parse(["--set", "year=2026", "--set", "holders=Erdem"]),
      ).toEqual({ set: ["year=2026", "holders=Erdem"] });
    });

    it("coexists with boolean and string flags", () => {
      const parser = new FlagParser({
        license: { type: "string", default: "", description: "License." },
        set: { type: "list", default: [], description: "Set a field." },
        tokens: { type: "boolean", default: false, description: "List." },
      });
      expect(
        parser.parse(["--license", "MIT", "--set", "year=2026", "--tokens"]),
      ).toEqual({ license: "MIT", set: ["year=2026"], tokens: true });
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

    it("shows a repeatable placeholder for list flags", () => {
      const parser = new FlagParser({
        set: {
          type: "list",
          default: [],
          description: "Set a field.",
          placeholder: "<field=value>",
        },
      });
      expect(parser.formatHelp()).toContain("--set <field=value>...");
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
