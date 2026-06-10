/*
 * SPDX-License-Identifier: Apache-2.0
 * SPDX-FileCopyrightText: 2026 Erdem Bircan
 * license-wizard managed-header v1 Apache-2.0 short 74d1a0534fa2
 */

import fs from "node:fs/promises";
import path from "node:path";
import type { IFileSystemReader } from "@configuration/interfaces/IFileSystemReader.js";
import { FileSystemReaderError } from "@configuration/errors/FileSystemReaderError.js";

/**
 * File system reader backed by native Node.js `fs/promises`.
 * All paths are resolved relative to the current working directory.
 */
export class NodeFileSystemReader implements IFileSystemReader {
  /**
   * Reads the contents of the file at the given path.
   * The path is resolved relative to the current working directory.
   *
   * @param filePath - The path to the file to read.
   * @throws {FileSystemReaderError} When the read operation fails.
   */
  async read(filePath: string): Promise<string> {
    const resolved = path.resolve(process.cwd(), filePath);
    try {
      return await fs.readFile(resolved, "utf-8");
    } catch (cause) {
      throw new FileSystemReaderError(
        `Failed to read file: ${resolved}`,
        cause,
      );
    }
  }

  /**
   * Returns whether a file exists at the given path.
   * The path is resolved relative to the current working directory.
   *
   * @param filePath - The path to check.
   * @throws {FileSystemReaderError} When the existence check fails unexpectedly.
   */
  async exists(filePath: string): Promise<boolean> {
    const resolved = path.resolve(process.cwd(), filePath);
    try {
      await fs.access(resolved);
      return true;
    } catch (cause) {
      const err = cause as NodeJS.ErrnoException;
      if (err.code === "ENOENT") {
        return false;
      }
      throw new FileSystemReaderError(
        `Failed to check existence of file: ${resolved}`,
        cause,
      );
    }
  }
}
