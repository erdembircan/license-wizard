/*
 * SPDX-License-Identifier: Apache-2.0
 * SPDX-FileCopyrightText: 2026 Erdem Bircan
 * license-wizard managed-header v1 Apache-2.0 short 74d1a0534fa2
 */

import { describe, it, expect } from "vitest";
import { HeaderComposer } from "@headers/HeaderComposer.js";
import { SourceFile } from "@headers/SourceFile.js";
import type { LicenseDetail } from "@licensing/LicenseDetail.js";

const MIT: LicenseDetail = {
  licenseId: "MIT",
  name: "MIT License",
  licenseText: "Permission is hereby granted...",
};

const headed = (source: string, path: string): string =>
  new HeaderComposer({
    detail: MIT,
    style: "short",
    comment: "block",
    tokens: {},
  }).apply(source, path);

describe("SourceFile", () => {
  describe("extensionOf", () => {
    it("returns the lowercased extension with its dot", () => {
      expect(SourceFile.extensionOf("src/App.TS")).toBe(".ts");
      expect(SourceFile.extensionOf("a/b/c.php")).toBe(".php");
    });

    it("returns empty for a dotfile or extensionless name", () => {
      expect(SourceFile.extensionOf(".gitignore")).toBe("");
      expect(SourceFile.extensionOf("Makefile")).toBe("");
    });
  });

  describe("commentStyleFor", () => {
    it("defaults to a plain block comment opener", () => {
      expect(SourceFile.commentStyleFor().blockStart).toBe("/*");
    });

    it("opens a docblock when asked, leaving the prefix and close unchanged", () => {
      const style = SourceFile.commentStyleFor("docblock");
      expect(style.blockStart).toBe("/**");
      expect(style.linePrefix).toBe(" *");
      expect(style.blockEnd).toBe(" */");
    });

    it("keeps the plain opener for the explicit block style", () => {
      expect(SourceFile.commentStyleFor("block").blockStart).toBe("/*");
    });
  });

  describe("hasManagedHeader", () => {
    it("is true for content carrying a managed header", () => {
      expect(
        new SourceFile(
          headed("export const x = 1;\n", "a.ts"),
          "a.ts",
        ).hasManagedHeader(),
      ).toBe(true);
    });

    it("is false for plain content", () => {
      expect(
        new SourceFile("export const x = 1;\n", "a.ts").hasManagedHeader(),
      ).toBe(false);
    });

    it("is false for code that merely names the marker token", () => {
      const source = 'const T = "license-wizard managed-header";\n';
      expect(new SourceFile(source, "a.ts").hasManagedHeader()).toBe(false);
    });

    it("is false for a marker-shaped line stranded in a template literal", () => {
      // A fully-formed marker line, but inside a backtick string — not sealed in
      // a comment, so it is not a managed block.
      const source = [
        "const banner = `",
        " * license-wizard managed-header v1 MIT short abcdef123456",
        "`;",
        "export const x = 1;",
        "",
      ].join("\n");
      expect(new SourceFile(source, "a.ts").hasManagedHeader()).toBe(false);
    });
  });

  describe("withoutManagedHeaders", () => {
    it("removes a managed header, restoring the original content", () => {
      const original = "export const x = 1;\n";
      const result = new SourceFile(headed(original, "a.ts"), "a.ts")
        .withoutManagedHeaders()
        .toString();

      expect(result).toBe(original);
    });

    it("returns a file with no managed header unchanged", () => {
      const source = "/* my own notice */\nexport const x = 1;\n";
      const result = new SourceFile(source, "a.ts")
        .withoutManagedHeaders()
        .toString();

      expect(result).toBe(source);
    });

    it("keeps a shebang and removes only the header", () => {
      const original = "#!/usr/bin/env node\nconsole.log(1);\n";
      const result = new SourceFile(headed(original, "cli.js"), "cli.js")
        .withoutManagedHeaders()
        .toString();

      expect(result).toBe(original);
    });

    it("keeps the PHP open tag and removes only the header", () => {
      const original = "<?php\necho 1;\n";
      const result = new SourceFile(headed(original, "x.php"), "x.php")
        .withoutManagedHeaders()
        .toString();

      expect(result).toBe(original);
    });

    it("never erases a file over a marker-shaped line in a template literal", () => {
      // Regression: a marker-shaped line with no enclosing comment must not be
      // treated as a managed block and have the whole file deleted around it.
      const source = [
        "const banner = `",
        " * license-wizard managed-header v1 MIT short abcdef123456",
        "`;",
        "export const x = 1;",
        "console.log(x);",
        "",
      ].join("\n");
      const result = new SourceFile(source, "a.ts")
        .withoutManagedHeaders()
        .toString();

      expect(result).toBe(source);
    });

    it("does not delete from an unrelated comment down to a stray marker", () => {
      // An ordinary block comment higher up, then a marker-shaped line stranded
      // in a template literal: nothing here is a managed block, so the file is
      // returned intact rather than gutted between the two.
      const source = [
        "/* unrelated banner",
        "   keep me */",
        "const banner = `",
        " * license-wizard managed-header v1 MIT short abcdef123456",
        "`;",
        "export const x = 1;",
        "",
      ].join("\n");
      const result = new SourceFile(source, "a.ts")
        .withoutManagedHeaders()
        .toString();

      expect(result).toContain("export const x = 1;");
      expect(result).toContain("/* unrelated banner");
    });

    it("still removes a real managed block sitting past a stray marker line", () => {
      // A false-positive marker line above a genuine managed block must not mask
      // the real block: the stray line is skipped and the real header removed,
      // while the stray line in the template literal is left untouched.
      const realBlock = headed("export const x = 1;\n", "a.ts").trimEnd();
      const source = [
        "const banner = `",
        " * license-wizard managed-header v1 MIT short deadbeef0000",
        "`;",
        "",
        realBlock,
        "export const x = 1;",
        "",
      ].join("\n");
      const occurrences = (text: string): number =>
        text.split("license-wizard managed-header").length - 1;

      const result = new SourceFile(source, "a.ts")
        .withoutManagedHeaders()
        .toString();

      // Both markers present going in; only the stray template-literal one
      // survives removal of the real block.
      expect(occurrences(source)).toBe(2);
      expect(occurrences(result)).toBe(1);
      expect(result).toContain("deadbeef0000");
      expect(result).toContain("export const x = 1;");
    });

    it("removes a header even when foreign code pushed it below the top", () => {
      const shifted = `import "./shim";\n\n${headed("export const x = 1;\n", "a.ts")}`;
      const result = new SourceFile(shifted, "a.ts")
        .withoutManagedHeaders()
        .toString();

      expect(result).not.toContain("license-wizard managed-header");
      expect(result).toContain('import "./shim";');
      expect(result).toContain("export const x = 1;");
    });
  });

  describe("withManagedHeader", () => {
    const block = (): string =>
      new HeaderComposer({
        detail: MIT,
        style: "short",
        comment: "block",
        tokens: {},
      }).block();

    it("inserts the block at the top of a plain file", () => {
      const result = new SourceFile("export const x = 1;\n", "a.ts")
        .withManagedHeader(block())
        .toString();

      expect(result).toBe(`${block()}\n\nexport const x = 1;\n`);
    });

    it("keeps a shebang above the header", () => {
      const result = new SourceFile(
        "#!/usr/bin/env node\nconsole.log(1);\n",
        "cli.js",
      )
        .withManagedHeader(block())
        .toString();

      expect(result.startsWith("#!/usr/bin/env node\n\n/*\n")).toBe(true);
    });

    it("places the block flush under the preamble when not separating it", () => {
      const result = new SourceFile("<?php\necho 1;\n", "index.php")
        .withManagedHeader(block(), { separateFromPreamble: false })
        .toString();

      // No blank line between the open tag and the block — what a docblock file
      // comment needs — while the gap below the block is preserved.
      expect(result.startsWith(`<?php\n${block()}\n\n`)).toBe(true);
    });

    it("replaces an existing managed header rather than stacking", () => {
      const once = new SourceFile("export const x = 1;\n", "a.ts")
        .withManagedHeader(block())
        .toString();
      const twice = new SourceFile(once, "a.ts")
        .withManagedHeader(block())
        .toString();

      expect(twice).toBe(once);
    });

    it("leaves code that names the marker token in place", () => {
      const source = 'const T = "license-wizard managed-header";\n';
      const result = new SourceFile(source, "a.ts")
        .withManagedHeader(block())
        .toString();

      expect(result).toContain('const T = "license-wizard managed-header";');
    });

    it("preserves CRLF line endings throughout the file", () => {
      const result = new SourceFile("const x = 1;\r\nconst y = 2;\r\n", "a.ts")
        .withManagedHeader(block())
        .toString();

      // Every line — the inserted header included — ends with CRLF, leaving no
      // mixed endings for a linter or git to flag.
      const lines = result.split("\n");
      for (const line of lines.slice(0, -1)) {
        expect(line.endsWith("\r")).toBe(true);
      }
      expect(result).toContain("SPDX-License-Identifier: MIT\r\n");
    });

    it("round-trips a CRLF file byte-for-byte through add then remove", () => {
      const original = "const x = 1;\r\nconst y = 2;\r\n";
      const headedSource = new SourceFile(original, "a.ts")
        .withManagedHeader(block())
        .toString();
      const restored = new SourceFile(headedSource, "a.ts")
        .withoutManagedHeaders()
        .toString();

      expect(restored).toBe(original);
    });
  });

  describe("canPlaceHeader", () => {
    it("is true for a non-PHP file", () => {
      expect(
        new SourceFile("export const x = 1;\n", "a.ts").canPlaceHeader(),
      ).toBe(true);
    });

    it("is true for a PHP file opening with <?php", () => {
      expect(new SourceFile("<?php\necho 1;\n", "x.php").canPlaceHeader()).toBe(
        true,
      );
    });

    it("is true for a PHP file with a shebang then <?php", () => {
      expect(
        new SourceFile(
          "#!/usr/bin/php\n<?php\necho 1;\n",
          "x.php",
        ).canPlaceHeader(),
      ).toBe(true);
    });

    it("is false for an HTML-first PHP template", () => {
      const html = "<html>\n<body><?php echo 1; ?></body>\n</html>\n";
      expect(new SourceFile(html, "page.php").canPlaceHeader()).toBe(false);
    });

    it("is true for an empty PHP file (nothing to leak)", () => {
      expect(new SourceFile("", "x.php").canPlaceHeader()).toBe(true);
    });
  });

  describe("hasForeignLicenseNotice", () => {
    it("is true for a file carrying a non-wizard SPDX tag", () => {
      const source = "// SPDX-License-Identifier: GPL-2.0-only\nconst x = 1;\n";
      expect(new SourceFile(source, "a.ts").hasForeignLicenseNotice()).toBe(
        true,
      );
    });

    it("is false for a plain file", () => {
      expect(
        new SourceFile("const x = 1;\n", "a.ts").hasForeignLicenseNotice(),
      ).toBe(false);
    });

    it("ignores the wizard's own managed header", () => {
      const headedSource = headed("const x = 1;\n", "a.ts");
      expect(
        new SourceFile(headedSource, "a.ts").hasForeignLicenseNotice(),
      ).toBe(false);
    });
  });
});
