import { describe, it, expect } from "vitest";
import { LicenseTemplate } from "@licensing/LicenseTemplate.js";

const MIT_TEMPLATE = [
  "<<beginOptional>>MIT License",
  "",
  '<<endOptional>><<var;name="copyright";original="Copyright (c) <year> <copyright holders>";match=".{0,5000}">>',
  'Permission to use the "<<var;name="Software1";original="Software";match="Software|Materials">>".',
].join("\n");

describe("LicenseTemplate", () => {
  describe("slots", () => {
    it("extracts the angle-bracket slots from the copyright variable", () => {
      const template = new LicenseTemplate(MIT_TEMPLATE);

      expect(template.slots()).toEqual([
        { token: "<year>", label: "year" },
        { token: "<copyright holders>", label: "copyright holders" },
      ]);
    });

    it("extracts square-bracket slots (e.g. Apache style)", () => {
      const template = new LicenseTemplate(
        '<<var;name="copyright";original="[yyyy] [name of copyright owner]";match=".{0,5000}">>',
      );

      expect(template.slots()).toEqual([
        { token: "[yyyy]", label: "yyyy" },
        {
          token: "[name of copyright owner]",
          label: "name of copyright owner",
        },
      ]);
    });

    it("returns a single slot for a one-token copyright (e.g. ISC)", () => {
      const template = new LicenseTemplate(
        '<<var;name="copyright";original="<copyright notice>";match=".{0,5000}">>',
      );

      expect(template.slots()).toEqual([
        { token: "<copyright notice>", label: "copyright notice" },
      ]);
    });

    it("deduplicates repeated tokens, preserving first-seen order", () => {
      const template = new LicenseTemplate(
        '<<var;name="copyright";original="<year> <name> <year>";match=".*">>',
      );

      expect(template.slots()).toEqual([
        { token: "<year>", label: "year" },
        { token: "<name>", label: "name" },
      ]);
    });

    it("returns no slots when there is no copyright variable", () => {
      const template = new LicenseTemplate(
        '<<var;name="bullet";original="1.";match=".{0,20}">>',
      );

      expect(template.slots()).toEqual([]);
    });

    it("returns no slots for an empty template", () => {
      expect(new LicenseTemplate("").slots()).toEqual([]);
    });
  });

  describe("render", () => {
    it("substitutes slot values, replaces other vars with their originals, and strips optional markers", () => {
      const result = new LicenseTemplate(MIT_TEMPLATE).render({
        "<year>": "2026",
        "<copyright holders>": "Erdem Bircan",
      });

      expect(result).toBe(
        [
          "MIT License",
          "",
          "Copyright (c) 2026 Erdem Bircan",
          'Permission to use the "Software".',
        ].join("\n"),
      );
    });

    it("leaves a slot token unchanged when no value is provided", () => {
      const result = new LicenseTemplate(MIT_TEMPLATE).render({
        "<year>": "2026",
      });

      expect(result).toContain("Copyright (c) 2026 <copyright holders>");
    });

    it("falls back to the original copyright text when no values are given", () => {
      const result = new LicenseTemplate(MIT_TEMPLATE).render({});

      expect(result).toContain("Copyright (c) <year> <copyright holders>");
      expect(result).toContain('Permission to use the "Software".');
    });
  });

  describe("resolveSlots", () => {
    it("maps supplied fields to their tokens and reports nothing missing or unknown", () => {
      const result = new LicenseTemplate(MIT_TEMPLATE).resolveSlots(
        new Map([
          ["year", "2026"],
          ["copyright holders", "Erdem Bircan"],
        ]),
      );

      expect(result).toEqual({
        values: {
          "<year>": "2026",
          "<copyright holders>": "Erdem Bircan",
        },
        missing: [],
        unknown: [],
      });
    });

    it("matches a field by its label case-insensitively or by its bracket token", () => {
      const result = new LicenseTemplate(MIT_TEMPLATE).resolveSlots(
        new Map([
          ["YEAR", "2026"],
          ["<copyright holders>", "Erdem Bircan"],
        ]),
      );

      expect(result.values).toEqual({
        "<year>": "2026",
        "<copyright holders>": "Erdem Bircan",
      });
      expect(result.unknown).toEqual([]);
    });

    it("reports slots left without a value as missing", () => {
      const result = new LicenseTemplate(MIT_TEMPLATE).resolveSlots(
        new Map([["year", "2026"]]),
      );

      expect(result.values).toEqual({ "<year>": "2026" });
      expect(result.missing).toEqual([
        { token: "<copyright holders>", label: "copyright holders" },
      ]);
      expect(result.unknown).toEqual([]);
    });

    it("treats an empty or whitespace-only value as a missing field, not a filled one", () => {
      const result = new LicenseTemplate(MIT_TEMPLATE).resolveSlots(
        new Map([
          ["year", ""],
          ["copyright holders", "   "],
        ]),
      );

      expect(result.values).toEqual({});
      expect(result.missing).toEqual([
        { token: "<year>", label: "year" },
        { token: "<copyright holders>", label: "copyright holders" },
      ]);
      expect(result.unknown).toEqual([]);
    });

    it("collects supplied fields that match no slot as unknown", () => {
      const result = new LicenseTemplate(MIT_TEMPLATE).resolveSlots(
        new Map([
          ["year", "2026"],
          ["author", "Erdem"],
        ]),
      );

      expect(result.values).toEqual({ "<year>": "2026" });
      expect(result.unknown).toEqual(["author"]);
    });

    it("treats every field as unknown when the license has no slots", () => {
      const result = new LicenseTemplate("").resolveSlots(
        new Map([["year", "2026"]]),
      );

      expect(result).toEqual({
        values: {},
        missing: [],
        unknown: ["year"],
      });
    });
  });
});
