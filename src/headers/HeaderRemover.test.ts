/*
 * SPDX-License-Identifier: Apache-2.0
 * SPDX-FileCopyrightText: 2026 Erdem Bircan
 * license-wizard managed-header v1 Apache-2.0 short 74d1a0534fa2
 */

import { describe, it, expect } from "vitest";
import type { IFileSystemReader } from "@configuration/interfaces/IFileSystemReader.js";
import type { IFileSystemWriter } from "@configuration/interfaces/IFileSystemWriter.js";
import { HeaderComposer } from "@headers/HeaderComposer.js";
import { HeaderRemover } from "@headers/HeaderRemover.js";
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

class FakeFs implements IFileSystemReader, IFileSystemWriter {
  readonly files: Map<string, string>;
  writes = 0;

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
    this.writes += 1;
    this.files.set(path, content);
  }

  async delete(path: string): Promise<void> {
    this.files.delete(path);
  }
}

describe("HeaderRemover", () => {
  it("strips headers from files that have them, leaving the rest untouched", async () => {
    const fs = new FakeFs({
      "a.ts": headed("export const a = 1;\n", "a.ts"),
      "b.ts": "export const b = 2;\n",
    });

    const summary = await new HeaderRemover(fs, fs).remove(["a.ts", "b.ts"]);

    expect(summary.removed).toEqual(["a.ts"]);
    expect(summary.total).toBe(2);
    expect(fs.files.get("a.ts")).toBe("export const a = 1;\n");
    expect(fs.files.get("b.ts")).toBe("export const b = 2;\n");
    expect(fs.writes).toBe(1);
  });

  it("writes nothing when no file carries a managed header", async () => {
    const fs = new FakeFs({ "a.ts": "export const a = 1;\n" });

    const summary = await new HeaderRemover(fs, fs).remove(["a.ts"]);

    expect(summary.removed).toEqual([]);
    expect(fs.writes).toBe(0);
  });

  it("reports progress for every file examined", async () => {
    const fs = new FakeFs({
      "a.ts": headed("export const a = 1;\n", "a.ts"),
      "b.ts": "export const b = 2;\n",
    });
    const seen: number[] = [];

    await new HeaderRemover(fs, fs).remove(["a.ts", "b.ts"], (p) =>
      seen.push(p.done),
    );

    expect(seen).toEqual([1, 2]);
  });
});
