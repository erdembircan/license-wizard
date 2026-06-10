/*
 * SPDX-License-Identifier: Apache-2.0
 * SPDX-FileCopyrightText: 2026 Erdem Bircan
 * license-wizard managed-header v1 Apache-2.0 short 74d1a0534fa2
 */

import { describe, it, expect } from "vitest";
import { HeaderRenderer } from "@headers/HeaderRenderer.js";
import type { LicenseDetail } from "@licensing/LicenseDetail.js";

const APACHE: LicenseDetail = {
  licenseId: "Apache-2.0",
  name: "Apache License 2.0",
  licenseText: "Apache License...",
  standardLicenseHeader:
    'Copyright [yyyy] [name of copyright owner]\n\nLicensed under the Apache License, Version 2.0 (the "License");\nyou may not use this file except in compliance with the License.\n\n',
  standardLicenseHeaderTemplate:
    'Copyright <<var;name="copyright";original="[yyyy] [name of copyright owner]";match=".+">>\n\nLicensed under the Apache License, Version 2.0 (the "License");\nyou may not use this file except in compliance with the License.\n\n',
};

const MIT: LicenseDetail = {
  licenseId: "MIT",
  name: "MIT License",
  licenseText: "Permission is hereby granted...",
};

describe("HeaderRenderer", () => {
  describe("supportsFull", () => {
    it("is true for a license that publishes a standard header", () => {
      expect(HeaderRenderer.supportsFull(APACHE)).toBe(true);
    });

    it("is false for a license without one (e.g. MIT)", () => {
      expect(HeaderRenderer.supportsFull(MIT)).toBe(false);
    });

    it("is false for a blank standard header", () => {
      expect(
        HeaderRenderer.supportsFull({
          ...APACHE,
          standardLicenseHeader: "  \n",
        }),
      ).toBe(false);
    });
  });

  describe("fullHeaderHasUnfilledPlaceholders", () => {
    // GPL-style: a full notice carrying its own copyright placeholders. The
    // interactive flow discovers no *body* copyright fields for the GPL family,
    // so the user is never asked for a year/name and the tokens stay empty —
    // leaving the header's `<year>` / `<name of author>` unfillable.
    const GPL: LicenseDetail = {
      licenseId: "GPL-3.0-only",
      name: "GNU General Public License v3.0 only",
      licenseText: "...",
      standardLicenseHeader: "Copyright (C) <year> <name of author>",
      standardLicenseHeaderTemplate:
        'Copyright (C) <<var;name="copyright";original="<year> <name of author>";match=".+">>',
    };

    it("is false for a license that publishes no standard header (MIT)", () => {
      expect(HeaderRenderer.fullHeaderHasUnfilledPlaceholders(MIT, {})).toBe(
        false,
      );
    });

    it("is true when the full notice keeps placeholders no token fills", () => {
      // With empty tokens, the GPL header's `<year>` / `<name of author>`
      // survive into the rendered body.
      expect(HeaderRenderer.fullHeaderHasUnfilledPlaceholders(GPL, {})).toBe(
        true,
      );
    });

    it("is true for an uncustomized Apache header (placeholders survive)", () => {
      expect(HeaderRenderer.fullHeaderHasUnfilledPlaceholders(APACHE, {})).toBe(
        true,
      );
    });

    it("is false once the supplied tokens fill every placeholder", () => {
      expect(
        HeaderRenderer.fullHeaderHasUnfilledPlaceholders(APACHE, {
          "[yyyy]": "2026",
          "[name of copyright owner]": "Erdem Bircan",
        }),
      ).toBe(false);
    });
  });

  describe("short style", () => {
    it("emits just the identifier tag when no tokens are given", () => {
      const body = new HeaderRenderer({
        detail: MIT,
        style: "short",
        tokens: {},
      }).body();

      expect(body).toBe("SPDX-License-Identifier: MIT");
    });

    it("adds a copyright tag built from the token values", () => {
      const body = new HeaderRenderer({
        detail: APACHE,
        style: "short",
        tokens: {
          "[yyyy]": "2026",
          "[name of copyright owner]": "Erdem Bircan",
        },
      }).body();

      expect(body).toBe(
        "SPDX-License-Identifier: Apache-2.0\n" +
          "SPDX-FileCopyrightText: 2026 Erdem Bircan",
      );
    });

    it("works for every license, even ones without a standard header", () => {
      const body = new HeaderRenderer({
        detail: MIT,
        style: "short",
        tokens: { "<year>": "2026", "<copyright holders>": "Erdem Bircan" },
      }).body();

      expect(body).toBe(
        "SPDX-License-Identifier: MIT\n" +
          "SPDX-FileCopyrightText: 2026 Erdem Bircan",
      );
    });
  });

  describe("full style", () => {
    it("uses the plain standard header, trimmed, when not customized", () => {
      const body = new HeaderRenderer({
        detail: APACHE,
        style: "full",
        tokens: {},
      }).body();

      expect(body).toBe(
        "Copyright [yyyy] [name of copyright owner]\n\n" +
          'Licensed under the Apache License, Version 2.0 (the "License");\n' +
          "you may not use this file except in compliance with the License.",
      );
    });

    it("substitutes copyright tokens via the header template when customized", () => {
      const body = new HeaderRenderer({
        detail: APACHE,
        style: "full",
        tokens: {
          "[yyyy]": "2026",
          "[name of copyright owner]": "Erdem Bircan",
        },
      }).body();

      expect(body.startsWith("Copyright 2026 Erdem Bircan")).toBe(true);
      expect(body).not.toContain("[yyyy]");
    });

    it("trims surrounding blank lines and trailing whitespace", () => {
      const body = new HeaderRenderer({
        detail: APACHE,
        style: "full",
        tokens: {},
      }).body();

      expect(body.startsWith("Copyright")).toBe(true);
      expect(body.endsWith("License.")).toBe(true);
    });
  });
});
