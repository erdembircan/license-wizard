import fs from "node:fs/promises";
import path from "node:path";
import type { IFileTreeWalker } from "@headers/interfaces/IFileTreeWalker.js";

/**
 * File tree walker backed by native Node.js `fs/promises`. Paths are resolved
 * relative to the current working directory and returned as POSIX-style paths
 * relative to the walk root, sorted for deterministic output.
 */
export class NodeFileTreeWalker implements IFileTreeWalker {
  /**
   * Recursively lists every file beneath `root`, pruning any directory for which
   * `skipDirectory` returns true. Symlinked directories are not followed, so the
   * walk cannot loop. Returns relative POSIX paths, sorted.
   *
   * @param root - The directory to walk, relative to the working directory.
   * @param skipDirectory - Predicate that prunes a directory by its relative path.
   */
  async walk(
    root: string,
    skipDirectory: (relativePath: string) => boolean,
  ): Promise<string[]> {
    const base = path.resolve(process.cwd(), root);
    const files: string[] = [];
    await this.#descend(base, "", skipDirectory, files);
    return files.sort();
  }

  /**
   * Reads one directory and recurses into its unpruned subdirectories,
   * accumulating file paths relative to the walk root.
   */
  async #descend(
    base: string,
    relative: string,
    skipDirectory: (relativePath: string) => boolean,
    files: string[],
  ): Promise<void> {
    const absolute = relative === "" ? base : path.join(base, relative);
    const entries = await fs.readdir(absolute, { withFileTypes: true });

    for (const entry of entries) {
      const childRelative =
        relative === "" ? entry.name : `${relative}/${entry.name}`;

      if (entry.isDirectory()) {
        if (!skipDirectory(childRelative)) {
          await this.#descend(base, childRelative, skipDirectory, files);
        }
      } else if (entry.isFile()) {
        files.push(childRelative);
      }
    }
  }
}
