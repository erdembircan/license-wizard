/*
 * SPDX-License-Identifier: Apache-2.0
 * SPDX-FileCopyrightText: 2026 Erdem Bircan
 * license-wizard managed-header v1 Apache-2.0 short 74d1a0534fa2
 */

import { describe, it, expect } from "vitest";
import type { IFileSystemReader } from "@configuration/interfaces/IFileSystemReader.js";
import type { IFileTreeWalker } from "@headers/interfaces/IFileTreeWalker.js";
import { SourceFileScanner } from "@headers/SourceFileScanner.js";

/**
 * A walker over a fixed file list that honours directory pruning by dropping any
 * file beneath a directory the predicate skips, mirroring a real tree walk.
 */
class FakeWalker implements IFileTreeWalker {
  readonly #files: string[];

  constructor(files: string[]) {
    this.#files = files;
  }

  async walk(
    _root: string,
    skipDirectory: (relativePath: string) => boolean,
  ): Promise<string[]> {
    return this.#files
      .filter((file) => {
        const parts = file.split("/");
        let dir = "";
        for (let i = 0; i < parts.length - 1; i += 1) {
          dir = dir === "" ? parts[i] : `${dir}/${parts[i]}`;
          if (skipDirectory(dir)) {
            return false;
          }
        }
        return true;
      })
      .sort();
  }
}

/**
 * An in-memory reader over a map of file contents.
 */
class FakeReader implements IFileSystemReader {
  readonly #files: Map<string, string>;

  constructor(files: Record<string, string> = {}) {
    this.#files = new Map(Object.entries(files));
  }

  async read(path: string): Promise<string> {
    return this.#files.get(path) ?? "";
  }

  async exists(path: string): Promise<boolean> {
    return this.#files.has(path);
  }
}

describe("SourceFileScanner", () => {
  it("keeps supported source files and drops other extensions", async () => {
    const walker = new FakeWalker([
      "src/index.ts",
      "src/app.jsx",
      "lib/util.php",
      "package.json",
      "styles/main.css",
      "README.md",
    ]);
    const scanner = new SourceFileScanner(walker, new FakeReader());

    expect(await scanner.scan()).toEqual([
      "lib/util.php",
      "src/app.jsx",
      "src/index.ts",
    ]);
  });

  it("prunes the default dependency and VCS directories", async () => {
    const walker = new FakeWalker([
      "src/index.ts",
      "node_modules/pkg/index.js",
      "vendor/lib/Class.php",
      ".git/hooks/pre-commit.js",
    ]);
    const scanner = new SourceFileScanner(walker, new FakeReader());

    expect(await scanner.scan()).toEqual(["src/index.ts"]);
  });

  it("honours the project's .gitignore", async () => {
    const walker = new FakeWalker([
      "src/index.ts",
      "dist/bundle.js",
      "generated/types.ts",
    ]);
    const reader = new FakeReader({ ".gitignore": "dist/\ngenerated/\n" });
    const scanner = new SourceFileScanner(walker, reader);

    expect(await scanner.scan()).toEqual(["src/index.ts"]);
  });

  it("applies caller-supplied extra ignores", async () => {
    const walker = new FakeWalker(["src/index.ts", "scripts/build.ts"]);
    const scanner = new SourceFileScanner(walker, new FakeReader());

    expect(await scanner.scan({ extraIgnores: ["scripts/"] })).toEqual([
      "src/index.ts",
    ]);
  });

  it("restricts to caller-supplied extensions", async () => {
    const walker = new FakeWalker(["a.ts", "b.php", "c.js"]);
    const scanner = new SourceFileScanner(walker, new FakeReader());

    expect(await scanner.scan({ extensions: [".php"] })).toEqual(["b.php"]);
  });
});
