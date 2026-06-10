/*
 * SPDX-License-Identifier: Apache-2.0
 * SPDX-FileCopyrightText: 2026 Erdem Bircan
 * license-wizard managed-header v1 Apache-2.0 short 74d1a0534fa2
 */

import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { IFileSystemWriter } from "@configuration/interfaces/IFileSystemWriter.js";
import { FileSystemWriterError } from "@configuration/errors/FileSystemWriterError.js";

/**
 * File system writer backed by native Node.js `fs/promises`.
 * All paths are resolved relative to the current working directory.
 * Creates any missing parent directories before writing.
 */
export class NodeFileSystemWriter implements IFileSystemWriter {
  /**
   * Writes the given content to the file at the given path, atomically: the
   * content goes to a uniquely-named temporary file in the same directory and is
   * then renamed over the target, so the destination is only ever the old
   * complete file or the new complete file — never a half-written truncation.
   * A plain in-place write truncates first, so a crash, a full disk, or a Ctrl-C
   * mid-write (this runs in a loop across every source file with no interrupt
   * guard) would leave a destroyed file; the rename closes that window. The path
   * is resolved relative to the current working directory and missing parent
   * directories are created.
   *
   * @param filePath - The path to the file to write.
   * @param content - The content to write.
   * @throws {FileSystemWriterError} When the write operation fails.
   */
  async write(filePath: string, content: string): Promise<void> {
    const resolved = path.resolve(process.cwd(), filePath);
    const temp = `${resolved}.${randomUUID()}.tmp`;
    try {
      await fs.mkdir(path.dirname(resolved), { recursive: true });
      await fs.writeFile(temp, content, "utf-8");
      await fs.rename(temp, resolved);
    } catch (cause) {
      // Best-effort cleanup of the temp file so a failed write leaves no debris.
      await fs.rm(temp, { force: true }).catch(() => {});
      throw new FileSystemWriterError(
        `Failed to write file: ${resolved}`,
        cause,
      );
    }
  }

  /**
   * Deletes the file at the given path, resolved relative to the current
   * working directory. Treats a missing file as success.
   *
   * @param filePath - The path to the file to delete.
   * @throws {FileSystemWriterError} When the delete operation fails.
   */
  async delete(filePath: string): Promise<void> {
    const resolved = path.resolve(process.cwd(), filePath);
    try {
      await fs.rm(resolved, { force: true });
    } catch (cause) {
      throw new FileSystemWriterError(
        `Failed to delete file: ${resolved}`,
        cause,
      );
    }
  }
}
