import { describe, it, expect } from "vitest";
import { HeaderComposer } from "@headers/HeaderComposer.js";
import type { HeaderPlan } from "@headers/HeaderPlan.js";
import { markerToken } from "@headers/HeaderMarker.js";
import type { LicenseDetail } from "@licensing/LicenseDetail.js";

const MIT: LicenseDetail = {
  licenseId: "MIT",
  name: "MIT License",
  licenseText: "Permission is hereby granted...",
};

const shortPlan: HeaderPlan = { detail: MIT, style: "short", tokens: {} };

const composer = () => new HeaderComposer(shortPlan);

describe("HeaderComposer", () => {
  describe("block", () => {
    it("wraps the body and a marker line in a block comment", () => {
      const block = composer().block(".ts");

      expect(block.startsWith("/*\n")).toBe(true);
      expect(block).toContain(" * SPDX-License-Identifier: MIT");
      expect(block).toContain(` * ${markerToken()}`);
      expect(block.endsWith("\n */")).toBe(true);
    });
  });

  describe("apply", () => {
    it("inserts the header at the very top of a plain file", () => {
      const result = composer().apply("export const x = 1;\n", "a.ts");

      expect(result).toBe(
        `${composer().block(".ts")}\n\nexport const x = 1;\n`,
      );
    });

    it("keeps a shebang above the header", () => {
      const result = composer().apply(
        "#!/usr/bin/env node\nconsole.log(1);\n",
        "cli.js",
      );

      expect(result.startsWith("#!/usr/bin/env node\n\n/*\n")).toBe(true);
      expect(result).toContain("\n\nconsole.log(1);\n");
    });

    it("inserts the header inside the PHP open tag, not above it", () => {
      const result = composer().apply("<?php\necho 1;\n", "index.php");

      expect(result.startsWith("<?php\n\n/*\n")).toBe(true);
      expect(result).not.toMatch(/^\/\*/);
      expect(result.trimEnd().endsWith("echo 1;")).toBe(true);
    });

    it("is idempotent — re-applying the same header changes nothing", () => {
      const once = composer().apply("export const x = 1;\n", "a.ts");
      const twice = composer().apply(once, "a.ts");

      expect(twice).toBe(once);
    });

    it("replaces a previously written managed header rather than stacking", () => {
      const headed = composer().apply("export const x = 1;\n", "a.ts");

      const other = new HeaderComposer({
        detail: { ...MIT, licenseId: "Apache-2.0" },
        style: "short",
        tokens: {},
      });
      const reheaded = other.apply(headed, "a.ts");

      expect(reheaded).toContain("SPDX-License-Identifier: Apache-2.0");
      expect(reheaded).not.toContain("SPDX-License-Identifier: MIT");
      // Exactly one managed block remains.
      expect(reheaded.split(markerToken()).length - 1).toBe(1);
    });

    it("relocates a managed header that foreign code pushed below the top", () => {
      const headed = composer().apply("export const x = 1;\n", "a.ts");
      // A tool prepended an import above our header, shifting it down.
      const shifted = `import "./shim";\n\n${headed}`;

      const result = composer().apply(shifted, "a.ts");

      // The header is back on top, the import follows it, and only one remains.
      expect(result.startsWith(composer().block(".ts"))).toBe(true);
      expect(result).toContain('import "./shim";');
      expect(result.split(markerToken()).length - 1).toBe(1);
    });

    it("collapses duplicate managed blocks left by an earlier run into one", () => {
      const block = composer().block(".ts");
      const doubled = `${block}\n\n${block}\n\nexport const x = 1;\n`;

      const result = composer().apply(doubled, "a.ts");

      expect(result.split(markerToken()).length - 1).toBe(1);
      expect(result).toBe(`${block}\n\nexport const x = 1;\n`);
    });

    it("does not mistake source that merely names the marker token for a header", () => {
      // A file whose own code references the token string and even embeds a
      // sample marker inside a string — like this project's own HeaderMarker
      // module and its tests. None of it is a real header block.
      const source = [
        `const TOKEN = "${markerToken()}";`,
        `const SAMPLE = "${markerToken()} v1 MIT short abc123def456";`,
        "export const x = 1;",
        "",
      ].join("\n");

      const result = composer().apply(source, "a.ts");

      // The header is added on top; none of the original code is excised.
      expect(result.startsWith(composer().block(".ts"))).toBe(true);
      expect(result).toContain(`const TOKEN = "${markerToken()}";`);
      expect(result).toContain("const SAMPLE =");
      expect(result).toContain("export const x = 1;");
      // Re-applying stays a no-op — the token-naming code is never excised.
      expect(composer().apply(result, "a.ts")).toBe(result);
    });

    it("leaves a hand-written comment that lacks the marker untouched", () => {
      const handwritten = "/* my own notice */\nexport const x = 1;\n";
      const result = composer().apply(handwritten, "a.ts");

      expect(result).toContain("/* my own notice */");
      expect(result).toContain(markerToken());
    });

    it("normalises a missing trailing newline", () => {
      const result = composer().apply("export const x = 1;", "a.ts");

      expect(result.endsWith("\n")).toBe(true);
    });

    it("heads an empty file with just the block", () => {
      const result = composer().apply("", "a.ts");

      expect(result).toBe(`${composer().block(".ts")}\n`);
    });
  });

  describe("hasManaged", () => {
    it("detects content carrying the marker", () => {
      const headed = composer().apply("export const x = 1;\n", "a.ts");
      expect(composer().hasManaged(headed)).toBe(true);
    });

    it("is false for unheaded content", () => {
      expect(composer().hasManaged("export const x = 1;\n")).toBe(false);
    });
  });
});
