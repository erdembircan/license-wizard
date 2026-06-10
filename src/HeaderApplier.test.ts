/*
 * SPDX-License-Identifier: Apache-2.0
 * SPDX-FileCopyrightText: 2026 Erdem Bircan
 * license-wizard managed-header v1 Apache-2.0 short 74d1a0534fa2
 */

import path from "node:path";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { IFileSystemReader } from "@configuration/interfaces/IFileSystemReader.js";
import type { IPathResolver } from "@configuration/interfaces/IPathResolver.js";
import type { IFileSystemWriter } from "@configuration/interfaces/IFileSystemWriter.js";
import { HeaderComposer } from "@headers/HeaderComposer.js";
import type { LicenseDetail } from "@licensing/LicenseDetail.js";
import type { LicenseRepository } from "@licensing/LicenseRepository.js";

// Control the discovered file list without walking the real working directory.
const state = vi.hoisted(() => ({ files: {} as Record<string, string> }));

vi.mock("@headers/NodeFileTreeWalker.js", () => ({
  NodeFileTreeWalker: vi.fn(function (this: { walk: () => Promise<string[]> }) {
    this.walk = async () => Object.keys(state.files);
  }),
}));

const { HeaderApplier } = await import("./HeaderApplier.js");

const DETAIL: LicenseDetail = {
  licenseId: "MIT",
  name: "MIT License",
  licenseText: "PLAIN LICENSE TEXT",
};

const licenses = {
  getLicense: async () => DETAIL,
} as unknown as LicenseRepository;

/**
 * Reader backed by the controlled file map; reports no `.gitignore` so the scan
 * applies only its defaults.
 */
const reader: IFileSystemReader & IPathResolver = {
  async read(filePath: string): Promise<string> {
    if (filePath in state.files) {
      return state.files[filePath];
    }
    throw new Error(`no such file: ${filePath}`);
  },
  async exists(filePath: string): Promise<boolean> {
    return filePath in state.files;
  },
  // No symlinks in the controlled map: a path resolves to itself under cwd, so
  // every target is inside the project.
  async realPath(filePath: string): Promise<string> {
    return path.resolve(filePath);
  },
};

const headed = (source: string, path: string): string =>
  new HeaderComposer({ detail: DETAIL, style: "short", tokens: {} }).apply(
    source,
    path,
  );

function makeWriter(): {
  writer: IFileSystemWriter;
  writes: { path: string; content: string }[];
} {
  const writes: { path: string; content: string }[] = [];
  const writer: IFileSystemWriter = {
    async write(path: string, content: string): Promise<void> {
      writes.push({ path, content });
      state.files[path] = content;
    },
    async delete(): Promise<void> {},
  };
  return { writer, writes };
}

describe("HeaderApplier", () => {
  beforeEach(() => {
    state.files = {};
  });

  describe("apply", () => {
    it("writes the header into each eligible file and tallies the result", async () => {
      state.files = { "a.ts": "export const a = 1;\n" };
      const { writer, writes } = makeWriter();
      const applier = new HeaderApplier(licenses, reader, writer);

      const report = await applier.apply("MIT", "short", {}, []);

      expect(report).toEqual({
        licenseId: "MIT",
        style: "short",
        total: 1,
        written: 1,
        unchanged: 0,
        skipped: [],
      });
      expect(writes[0].path).toBe("a.ts");
      expect(writes[0].content).toContain("SPDX-License-Identifier: MIT");
    });

    it("collects the paths of files the guard skips", async () => {
      state.files = {
        "a.ts": "export const a = 1;\n",
        "foreign.ts":
          "// SPDX-License-Identifier: GPL-3.0-only\nexport const b = 2;\n",
      };
      const { writer, writes } = makeWriter();
      const applier = new HeaderApplier(licenses, reader, writer);

      const report = await applier.apply("MIT", "short", {}, []);

      expect(report.written).toBe(1);
      expect(report.skipped).toEqual(["foreign.ts"]);
      expect(writes.some((w) => w.path === "foreign.ts")).toBe(false);
    });

    it("reports a zero tally and writes nothing when no files are found", async () => {
      const { writer, writes } = makeWriter();
      const applier = new HeaderApplier(licenses, reader, writer);

      const report = await applier.apply("MIT", "short", {}, []);

      expect(report).toEqual({
        licenseId: "MIT",
        style: "short",
        total: 0,
        written: 0,
        unchanged: 0,
        skipped: [],
      });
      expect(writes).toEqual([]);
    });
  });

  describe("preview", () => {
    it("returns the target files and a sample block without writing", async () => {
      state.files = { "a.ts": "export const a = 1;\n" };
      const { writer, writes } = makeWriter();
      const applier = new HeaderApplier(licenses, reader, writer);

      const preview = await applier.preview("MIT", "short", {}, []);

      expect(preview?.files).toEqual(["a.ts"]);
      expect(preview?.skipped).toEqual([]);
      expect(preview?.sample).toContain("SPDX-License-Identifier: MIT");
      expect(writes).toEqual([]);
    });

    it("partitions would-be-skipped files out of the target list", async () => {
      state.files = {
        "a.ts": "export const a = 1;\n",
        "foreign.ts":
          "// SPDX-License-Identifier: GPL-3.0-only\nexport const b = 2;\n",
      };
      const { writer, writes } = makeWriter();
      const applier = new HeaderApplier(licenses, reader, writer);

      const preview = await applier.preview("MIT", "short", {}, []);

      expect(preview?.files).toEqual(["a.ts"]);
      expect(preview?.skipped).toEqual(["foreign.ts"]);
      expect(writes).toEqual([]);
    });

    it("does not skip a foreign-notice file that already carries our managed block", async () => {
      // A file a header was forced into earlier: it carries both the wizard's
      // managed block and the original foreign notice. It must rejoin the
      // writable set rather than be re-skipped forever.
      const forced = headed(
        "// SPDX-License-Identifier: GPL-3.0-only\nexport const b = 2;\n",
        "forced.ts",
      );
      state.files = { "forced.ts": forced };
      const { writer } = makeWriter();
      const applier = new HeaderApplier(licenses, reader, writer);

      const preview = await applier.preview("MIT", "short", {}, []);

      expect(preview?.files).toEqual(["forced.ts"]);
      expect(preview?.skipped).toEqual([]);
    });

    it("returns null when no files are found", async () => {
      const { writer } = makeWriter();
      const applier = new HeaderApplier(licenses, reader, writer);

      expect(await applier.preview("MIT", "short", {}, [])).toBeNull();
    });
  });

  describe("forceApply", () => {
    it("forces a header into a file the guard would skip", async () => {
      state.files = {
        "foreign.ts":
          "// SPDX-License-Identifier: GPL-3.0-only\nexport const b = 2;\n",
      };
      const { writer, writes } = makeWriter();
      const applier = new HeaderApplier(licenses, reader, writer);

      const report = await applier.forceApply("MIT", "short", {}, "foreign.ts");

      expect(report.outcome).toBe("written");
      expect(report.file).toBe("foreign.ts");
      expect(writes[0].content).toContain("SPDX-License-Identifier: MIT");
    });

    it("reports an unchanged file when it already bears the exact header", async () => {
      state.files = {
        "a.ts": headed("export const a = 1;\n", "a.ts"),
      };
      const { writer, writes } = makeWriter();
      const applier = new HeaderApplier(licenses, reader, writer);

      const report = await applier.forceApply("MIT", "short", {}, "a.ts");

      expect(report.outcome).toBe("unchanged");
      expect(writes).toEqual([]);
    });

    it("reports a missing file without writing", async () => {
      const { writer, writes } = makeWriter();
      const applier = new HeaderApplier(licenses, reader, writer);

      const report = await applier.forceApply("MIT", "short", {}, "nope.ts");

      expect(report.outcome).toBe("missing");
      expect(writes).toEqual([]);
    });

    it("computes the outcome without writing under dryRun", async () => {
      state.files = {
        "foreign.ts":
          "// SPDX-License-Identifier: GPL-3.0-only\nexport const b = 2;\n",
      };
      const { writer, writes } = makeWriter();
      const applier = new HeaderApplier(licenses, reader, writer);

      const report = await applier.forceApply(
        "MIT",
        "short",
        {},
        "foreign.ts",
        {
          dryRun: true,
        },
      );

      expect(report.outcome).toBe("written");
      expect(writes).toEqual([]);
    });

    it("refuses a file whose extension the wizard does not head", async () => {
      state.files = { "package.json": '{ "name": "x" }\n' };
      const { writer, writes } = makeWriter();
      const applier = new HeaderApplier(licenses, reader, writer);

      const report = await applier.forceApply(
        "MIT",
        "short",
        {},
        "package.json",
      );

      expect(report.outcome).toBe("unsupported");
      expect(writes).toEqual([]);
    });

    it("refuses a target that resolves outside the project through a symlinked directory", async () => {
      // A reader whose realPath sends the target's parent directory outside the
      // project, standing in for a symlinked intermediate directory that a
      // lexical caller-side check cannot see.
      const symlinkReader: IFileSystemReader & IPathResolver = {
        read: async () =>
          "// SPDX-License-Identifier: GPL-3.0-only\nexport const b = 2;\n",
        exists: async () => true,
        realPath: async (p) =>
          p === "." ? "/project" : `/outside/${path.basename(p)}`,
      };
      const { writer, writes } = makeWriter();
      const applier = new HeaderApplier(licenses, symlinkReader, writer);

      const report = await applier.forceApply("MIT", "short", {}, "link/b.ts");

      expect(report.outcome).toBe("outside");
      expect(writes).toEqual([]);
    });
  });

  describe("remove", () => {
    it("strips managed headers and leaves bare files alone", async () => {
      state.files = {
        "a.ts": headed("export const a = 1;\n", "a.ts"),
        "b.ts": "export const b = 2;\n",
      };
      const { writer, writes } = makeWriter();
      const applier = new HeaderApplier(licenses, reader, writer);

      const report = await applier.remove([]);

      expect(report.removed).toEqual(["a.ts"]);
      expect(report.total).toBe(2);
      const write = writes.find((w) => w.path === "a.ts");
      expect(write?.content).toBe("export const a = 1;\n");
      expect(writes.some((w) => w.path === "b.ts")).toBe(false);
    });

    it("reports nothing removed when no files are found", async () => {
      const { writer } = makeWriter();
      const applier = new HeaderApplier(licenses, reader, writer);

      expect(await applier.remove([])).toEqual({ removed: [], total: 0 });
    });
  });

  describe("previewRemoval", () => {
    it("lists the files carrying a managed header without writing", async () => {
      state.files = {
        "a.ts": headed("export const a = 1;\n", "a.ts"),
        "b.ts": "export const b = 2;\n",
      };
      const { writer, writes } = makeWriter();
      const applier = new HeaderApplier(licenses, reader, writer);

      const report = await applier.previewRemoval([]);

      expect(report).toEqual({ removed: ["a.ts"], total: 2 });
      expect(writes).toEqual([]);
    });
  });
});
