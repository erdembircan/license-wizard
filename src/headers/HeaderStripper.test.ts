import { describe, it, expect } from "vitest";
import { HeaderComposer } from "@headers/HeaderComposer.js";
import { HeaderStripper } from "@headers/HeaderStripper.js";
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

describe("HeaderStripper", () => {
  it("removes a managed header, restoring the original content", () => {
    const original = "export const x = 1;\n";

    const { content, removed } = new HeaderStripper().strip(
      headed(original, "a.ts"),
      "a.ts",
    );

    expect(removed).toBe(true);
    expect(content).toBe(original);
  });

  it("leaves a file with no managed header untouched", () => {
    const source = "/* my own notice */\nexport const x = 1;\n";

    const { content, removed } = new HeaderStripper().strip(source, "a.ts");

    expect(removed).toBe(false);
    expect(content).toBe(source);
  });

  it("keeps a shebang and removes only the header", () => {
    const original = "#!/usr/bin/env node\nconsole.log(1);\n";

    const { content } = new HeaderStripper().strip(
      headed(original, "cli.js"),
      "cli.js",
    );

    expect(content).toBe(original);
  });

  it("keeps the PHP open tag and removes only the header", () => {
    const original = "<?php\necho 1;\n";

    const { content } = new HeaderStripper().strip(
      headed(original, "index.php"),
      "index.php",
    );

    expect(content).toBe(original);
  });

  it("strips a header even when foreign code pushed it below the top", () => {
    const shifted = `import "./shim";\n\n${headed("export const x = 1;\n", "a.ts")}`;

    const { content, removed } = new HeaderStripper().strip(shifted, "a.ts");

    expect(removed).toBe(true);
    expect(content).not.toContain("license-wizard managed-header");
    expect(content).toContain('import "./shim";');
    expect(content).toContain("export const x = 1;");
  });

  it("does not strip source that merely names the marker token", () => {
    const source =
      'const TOKEN = "license-wizard managed-header";\nexport const x = 1;\n';

    const { content, removed } = new HeaderStripper().strip(source, "a.ts");

    expect(removed).toBe(false);
    expect(content).toBe(source);
  });
});
