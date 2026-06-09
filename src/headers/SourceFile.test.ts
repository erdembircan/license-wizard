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
  new HeaderComposer({ detail: MIT, style: "short", tokens: {} }).apply(
    source,
    path,
  );

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
    const block = (path: string): string =>
      new HeaderComposer({ detail: MIT, style: "short", tokens: {} }).block(
        SourceFile.extensionOf(path),
      );

    it("inserts the block at the top of a plain file", () => {
      const result = new SourceFile("export const x = 1;\n", "a.ts")
        .withManagedHeader(block("a.ts"))
        .toString();

      expect(result).toBe(`${block("a.ts")}\n\nexport const x = 1;\n`);
    });

    it("keeps a shebang above the header", () => {
      const result = new SourceFile(
        "#!/usr/bin/env node\nconsole.log(1);\n",
        "cli.js",
      )
        .withManagedHeader(block("cli.js"))
        .toString();

      expect(result.startsWith("#!/usr/bin/env node\n\n/*\n")).toBe(true);
    });

    it("replaces an existing managed header rather than stacking", () => {
      const once = new SourceFile("export const x = 1;\n", "a.ts")
        .withManagedHeader(block("a.ts"))
        .toString();
      const twice = new SourceFile(once, "a.ts")
        .withManagedHeader(block("a.ts"))
        .toString();

      expect(twice).toBe(once);
    });

    it("leaves code that names the marker token in place", () => {
      const source = 'const T = "license-wizard managed-header";\n';
      const result = new SourceFile(source, "a.ts")
        .withManagedHeader(block("a.ts"))
        .toString();

      expect(result).toContain('const T = "license-wizard managed-header";');
    });

    it("preserves CRLF line endings throughout the file", () => {
      const result = new SourceFile("const x = 1;\r\nconst y = 2;\r\n", "a.ts")
        .withManagedHeader(block("a.ts"))
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
        .withManagedHeader(block("a.ts"))
        .toString();
      const restored = new SourceFile(headedSource, "a.ts")
        .withoutManagedHeaders()
        .toString();

      expect(restored).toBe(original);
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
