/*
 * SPDX-License-Identifier: Apache-2.0
 * SPDX-FileCopyrightText: 2026 Erdem Bircan
 * license-wizard managed-header v1 Apache-2.0 short 74d1a0534fa2
 */

import { describe, it, expect, vi } from "vitest";
import type { IFileSystemReader } from "@configuration/interfaces/IFileSystemReader.js";
import type { IFileSystemWriter } from "@configuration/interfaces/IFileSystemWriter.js";
import type { WizardConfig } from "@configuration/WizardConfig.js";
import { HeaderComposer } from "@headers/HeaderComposer.js";
import { HeaderVerifier } from "@headers/HeaderVerifier.js";
import type { IFileTreeWalker } from "@headers/interfaces/IFileTreeWalker.js";
import { SourceFileScanner } from "@headers/SourceFileScanner.js";
import { LicenseRepository } from "@licensing/LicenseRepository.js";
import type { ILicenseSource } from "@licensing/interfaces/ILicenseSource.js";
import type { LicenseDetail } from "@licensing/LicenseDetail.js";
import type { LicenseIndexEntry } from "@licensing/LicenseIndexEntry.js";

const MIT: LicenseDetail = {
  licenseId: "MIT",
  name: "MIT License",
  licenseText: "Permission is hereby granted...",
};

/**
 * In-memory file system backing both reader and writer roles.
 */
class FakeFs implements IFileSystemReader, IFileSystemWriter {
  readonly files: Map<string, string>;

  constructor(files: Record<string, string>) {
    this.files = new Map(Object.entries(files));
  }

  async read(path: string): Promise<string> {
    return this.files.get(path) ?? "";
  }

  async exists(path: string): Promise<boolean> {
    return this.files.has(path);
  }

  async write(path: string, content: string): Promise<void> {
    this.files.set(path, content);
  }

  async delete(path: string): Promise<void> {
    this.files.delete(path);
  }
}

class ListWalker implements IFileTreeWalker {
  readonly #files: string[];
  constructor(files: string[]) {
    this.#files = files;
  }
  async walk(): Promise<string[]> {
    return this.#files;
  }
}

const sourceFor = (detail: LicenseDetail): ILicenseSource => ({
  search: vi.fn(async (): Promise<LicenseIndexEntry[]> => []),
  suggest: vi.fn(async (): Promise<LicenseIndexEntry[]> => []),
  fetchLicense: vi.fn(async (): Promise<LicenseDetail> => detail),
});

const headedFile = (source: string, path: string): string =>
  new HeaderComposer({ detail: MIT, style: "short", tokens: {} }).apply(
    source,
    path,
  );

const setup = (files: Record<string, string>) => {
  const fs = new FakeFs(files);
  const paths = Object.keys(files).filter((p) => p !== ".gitignore");
  const scanner = new SourceFileScanner(new ListWalker(paths), fs);
  const repository = new LicenseRepository(sourceFor(MIT));
  const verifier = new HeaderVerifier(scanner, fs, fs, repository);
  return { fs, verifier };
};

const headedConfig: WizardConfig = {
  licenseId: "MIT",
  headers: { style: "short" },
};

describe("HeaderVerifier", () => {
  it("is disabled when the configuration does not opt into headers", async () => {
    const { verifier } = setup({ "a.ts": "x\n" });

    const outcome = await verifier.verify({ licenseId: "MIT" }, { fix: false });

    expect(outcome.kind).toBe("disabled");
  });

  it("matches when every source file already carries the correct header", async () => {
    const { verifier } = setup({
      "a.ts": headedFile("export const x = 1;\n", "a.ts"),
      "b.ts": headedFile("export const y = 2;\n", "b.ts"),
    });

    const outcome = await verifier.verify(headedConfig, { fix: false });

    expect(outcome.kind).toBe("match");
    if (outcome.kind === "match") {
      expect(outcome.matched).toHaveLength(2);
      expect(outcome.missing).toEqual([]);
    }
  });

  it("reports a mismatch under strict mode when a file lacks a header", async () => {
    const { fs, verifier } = setup({
      "a.ts": headedFile("export const x = 1;\n", "a.ts"),
      "b.ts": "export const y = 2;\n",
    });

    const outcome = await verifier.verify(headedConfig, { fix: false });

    expect(outcome.kind).toBe("mismatch");
    if (outcome.kind === "mismatch") {
      expect(outcome.missing).toEqual(["b.ts"]);
    }
    // Strict mode writes nothing.
    expect(fs.files.get("b.ts")).toBe("export const y = 2;\n");
  });

  it("adds a missing header when fixing", async () => {
    const { fs, verifier } = setup({ "b.ts": "export const y = 2;\n" });

    const outcome = await verifier.verify(headedConfig, { fix: true });

    expect(outcome.kind).toBe("fixed");
    if (outcome.kind === "fixed") {
      expect(outcome.fixed).toEqual(["b.ts"]);
    }
    expect(fs.files.get("b.ts")).toContain("SPDX-License-Identifier: MIT");
  });

  it("never writes a header over a foreign SPDX notice when fixing", async () => {
    const foreign =
      "// SPDX-License-Identifier: GPL-2.0-only\nexport const x = 1;\n";
    const { fs, verifier } = setup({ "a.ts": foreign });

    const outcome = await verifier.verify(headedConfig, { fix: true });

    // The installer refuses to head such a file; the verifier must too — it is
    // skipped, not "fixed" with a contradictory second declaration.
    if (outcome.kind !== "disabled") {
      expect(outcome.skipped).toEqual(["a.ts"]);
      expect(outcome.fixed).toEqual([]);
    }
    expect(fs.files.get("a.ts")).toBe(foreign);
  });

  it("honours the persisted ignore scope, not re-heading excluded files", async () => {
    const { fs, verifier } = setup({
      "src/a.ts": headedFile("export const x = 1;\n", "src/a.ts"),
      "generated/b.ts": "export const y = 2;\n",
    });

    // The headers were installed with `--headers-ignore generated/`, persisted
    // into the config; a fixing verify must not write into the excluded file.
    const outcome = await verifier.verify(
      { licenseId: "MIT", headers: { style: "short", ignore: ["generated/"] } },
      { fix: true },
    );

    expect(outcome.kind).toBe("match");
    expect(fs.files.get("generated/b.ts")).toBe("export const y = 2;\n");
  });

  it("skips an HTML-first PHP file rather than leak the header to the page", async () => {
    const htmlFirst = "<html>\n<body><?php echo 1; ?></body>\n</html>\n";
    const { fs, verifier } = setup({ "page.php": htmlFirst });

    const outcome = await verifier.verify(headedConfig, { fix: true });

    if (outcome.kind !== "disabled") {
      expect(outcome.skipped).toEqual(["page.php"]);
    }
    expect(fs.files.get("page.php")).toBe(htmlFirst);
  });

  it("rewrites a drifted header (wrong license) when fixing", async () => {
    const drifted = new HeaderComposer({
      detail: { ...MIT, licenseId: "Apache-2.0" },
      style: "short",
      tokens: {},
    }).apply("export const x = 1;\n", "a.ts");
    const { fs, verifier } = setup({ "a.ts": drifted });

    const outcome = await verifier.verify(headedConfig, { fix: true });

    expect(outcome.kind).toBe("fixed");
    if (outcome.kind === "fixed") {
      expect(outcome.drifted).toEqual([
        {
          file: "a.ts",
          declares: { licenseId: "Apache-2.0", style: "short" },
          reason: "outdated",
        },
      ]);
    }
    expect(fs.files.get("a.ts")).toContain("SPDX-License-Identifier: MIT");
    expect(fs.files.get("a.ts")).not.toContain("Apache-2.0");
  });

  it("labels drift from a previous selection as outdated, recording what it declares", async () => {
    const previous = new HeaderComposer({
      detail: { ...MIT, licenseId: "Apache-2.0" },
      style: "short",
      tokens: {},
    }).apply("export const x = 1;\n", "a.ts");
    const { verifier } = setup({ "a.ts": previous });

    const outcome = await verifier.verify(headedConfig, { fix: false });

    expect(outcome.kind).toBe("mismatch");
    if (outcome.kind === "mismatch") {
      expect(outcome.drifted).toEqual([
        {
          file: "a.ts",
          declares: { licenseId: "Apache-2.0", style: "short" },
          reason: "outdated",
        },
      ]);
    }
  });

  it("relocates a header that foreign code pushed below the top when fixing", async () => {
    const headed = headedFile("export const x = 1;\n", "a.ts");
    const shifted = `import "./shim";\n\n${headed}`;
    const { fs, verifier } = setup({ "a.ts": shifted });

    const outcome = await verifier.verify(headedConfig, { fix: true });

    expect(outcome.kind).toBe("fixed");
    const result = fs.files.get("a.ts") ?? "";
    // One header, back on top, with the foreign import preserved below it.
    expect(result.split("SPDX-License-Identifier").length - 1).toBe(1);
    expect(result.startsWith("/*")).toBe(true);
    expect(result).toContain('import "./shim";');
  });

  it("labels a hand-edited managed header as edited", async () => {
    // Tamper the body but leave the marker line — its hash still claims the
    // current MIT/short selection, so the drift can only be a manual edit.
    const tampered = headedFile("export const x = 1;\n", "a.ts").replace(
      "SPDX-License-Identifier: MIT",
      "SPDX-License-Identifier: MIT-tampered",
    );
    const { verifier } = setup({ "a.ts": tampered });

    const outcome = await verifier.verify(headedConfig, { fix: false });

    expect(outcome.kind).toBe("mismatch");
    if (outcome.kind === "mismatch") {
      expect(outcome.drifted).toEqual([
        {
          file: "a.ts",
          declares: { licenseId: "MIT", style: "short" },
          reason: "edited",
        },
      ]);
    }
  });
});
