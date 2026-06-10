/*
 * SPDX-License-Identifier: Apache-2.0
 * SPDX-FileCopyrightText: 2026 Erdem Bircan
 * license-wizard managed-header v1 Apache-2.0 short 74d1a0534fa2
 */

import { describe, it, expect } from "vitest";
import { LicenseCopyright } from "@licensing/LicenseCopyright.js";
import type { LicenseDetail } from "@licensing/LicenseDetail.js";

const copyrightVar = (original: string): string =>
  `<<var;name="copyright";original="${original}";match=".*">>`;

// MIT-style: copyright in the body, no standard header.
const MIT: LicenseDetail = {
  licenseId: "MIT",
  name: "MIT License",
  licenseText: "x",
  standardLicenseTemplate: copyrightVar(
    "Copyright (c) <year> <copyright holders>",
  ),
};

// GPL-style: no copyright in the body, but the header carries the placeholders.
const GPL: LicenseDetail = {
  licenseId: "GPL-3.0-only",
  name: "GNU GPL v3.0 only",
  licenseText: "x",
  standardLicenseTemplate: copyrightVar("This program is free software"),
  standardLicenseHeaderTemplate: copyrightVar("<year> <name of author>"),
};

// Apache-style: the same copyright tokens appear in both the body and the header.
const APACHE: LicenseDetail = {
  licenseId: "Apache-2.0",
  name: "Apache License 2.0",
  licenseText: "x",
  standardLicenseTemplate: copyrightVar("[yyyy] [name of copyright owner]"),
  standardLicenseHeaderTemplate: copyrightVar(
    "[yyyy] [name of copyright owner]",
  ),
};

describe("LicenseCopyright", () => {
  describe("slots", () => {
    it("returns the body's copyright slots for a body-only license", () => {
      expect(LicenseCopyright.fromDetail(MIT).slots()).toEqual([
        { token: "<year>", label: "year" },
        { token: "<copyright holders>", label: "copyright holders" },
      ]);
    });

    it("surfaces header-only copyright slots when the body has none", () => {
      // The crux: GPL exposes no body copyright, so without the header these
      // fields would never be offered — yet the header needs them.
      expect(LicenseCopyright.fromDetail(GPL).slots()).toEqual([
        { token: "<year>", label: "year" },
        { token: "<name of author>", label: "name of author" },
      ]);
    });

    it("groups a token shared by body and header into one slot", () => {
      // Apache uses the identical [yyyy] / [name of copyright owner] in both
      // surfaces; the union must ask for each once, not twice.
      expect(LicenseCopyright.fromDetail(APACHE).slots()).toEqual([
        { token: "[yyyy]", label: "yyyy" },
        {
          token: "[name of copyright owner]",
          label: "name of copyright owner",
        },
      ]);
    });

    it("is empty for a license with no copyright on either surface", () => {
      expect(
        LicenseCopyright.fromDetail({
          licenseId: "X",
          name: "X",
          licenseText: "x",
        }).slots(),
      ).toEqual([]);
    });
  });

  describe("requiredSlots", () => {
    it("excludes header-only slots when no full header is requested", () => {
      // GPL's body has no copyright, so a non-full run requires nothing.
      expect(LicenseCopyright.fromDetail(GPL).requiredSlots(false)).toEqual([]);
    });

    it("includes the header's slots when a full header is requested", () => {
      expect(LicenseCopyright.fromDetail(GPL).requiredSlots(true)).toEqual([
        { token: "<year>", label: "year" },
        { token: "<name of author>", label: "name of author" },
      ]);
    });

    it("requires only the body's slots for a body-only license", () => {
      expect(LicenseCopyright.fromDetail(MIT).requiredSlots(false)).toEqual([
        { token: "<year>", label: "year" },
        { token: "<copyright holders>", label: "copyright holders" },
      ]);
    });
  });

  describe("resolveFor", () => {
    it("resolves header-only tokens when a full header is requested", () => {
      const result = LicenseCopyright.fromDetail(GPL).resolveFor(
        new Map([
          ["year", "2026"],
          ["name of author", "Jane Doe"],
        ]),
        true,
      );

      expect(result.values).toEqual({
        "<year>": "2026",
        "<name of author>": "Jane Doe",
      });
      expect(result.missing).toEqual([]);
      expect(result.unknown).toEqual([]);
    });

    it("treats a header-only field as unknown when no full header is requested", () => {
      // The crux of the scoping: `--set year=…` on GPL without a full header
      // targets a field nothing being generated uses, so it's unknown — not a
      // demand to also supply `name of author`.
      const result = LicenseCopyright.fromDetail(GPL).resolveFor(
        new Map([["year", "2026"]]),
        false,
      );

      expect(result.unknown).toEqual(["year"]);
      expect(result.missing).toEqual([]);
    });
  });
});
