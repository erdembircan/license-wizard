import { describe, it, expect, vi } from "vitest";
import type { IFileSystemReader } from "@configuration/interfaces/IFileSystemReader.js";
import type { IFileSystemWriter } from "@configuration/interfaces/IFileSystemWriter.js";
import { HeaderInstaller } from "@headers/HeaderInstaller.js";
import { markerToken } from "@headers/HeaderMarker.js";
import type { HeaderPlan } from "@headers/HeaderPlan.js";
import type { LicenseDetail } from "@licensing/LicenseDetail.js";

const MIT: LicenseDetail = {
  licenseId: "MIT",
  name: "MIT License",
  licenseText: "Permission is hereby granted...",
};

const plan: HeaderPlan = { detail: MIT, style: "short", tokens: {} };

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

describe("HeaderInstaller", () => {
  it("writes a header into each file and reports them as written", async () => {
    const fs = new FakeFs({
      "a.ts": "export const x = 1;\n",
      "b.php": "<?php\necho 1;\n",
    });
    const installer = new HeaderInstaller(fs, fs);

    const summary = await installer.install(["a.ts", "b.php"], plan);

    expect(summary.written).toEqual(["a.ts", "b.php"]);
    expect(summary.unchanged).toEqual([]);
    expect(fs.files.get("a.ts")).toContain("SPDX-License-Identifier: MIT");
    expect(fs.files.get("a.ts")).toContain(markerToken());
    expect(fs.files.get("b.php")!.startsWith("<?php\n\n/*")).toBe(true);
  });

  it("leaves already-headed files untouched on a second run", async () => {
    const fs = new FakeFs({ "a.ts": "export const x = 1;\n" });
    const installer = new HeaderInstaller(fs, fs);

    await installer.install(["a.ts"], plan);
    const after = fs.files.get("a.ts");
    const summary = await installer.install(["a.ts"], plan);

    expect(summary.written).toEqual([]);
    expect(summary.unchanged).toEqual(["a.ts"]);
    expect(fs.files.get("a.ts")).toBe(after);
  });

  it("reports progress after each file", async () => {
    const fs = new FakeFs({ "a.ts": "a\n", "b.ts": "b\n", "c.ts": "c\n" });
    const installer = new HeaderInstaller(fs, fs);
    const onProgress = vi.fn();

    await installer.install(["a.ts", "b.ts", "c.ts"], plan, onProgress);

    expect(onProgress).toHaveBeenCalledTimes(3);
    expect(onProgress).toHaveBeenLastCalledWith({
      done: 3,
      total: 3,
      file: "c.ts",
    });
  });
});
