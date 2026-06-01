import fs from "node:fs/promises";
import path from "node:path";
import type { IFileSystemWriter } from "@configuration/interfaces/IFileSystemWriter.js";
import { FileSystemWriterError } from "@configuration/errors/FileSystemWriterError.js";

/**
 * File system writer backed by native Node.js `fs/promises`.
 * All paths are resolved relative to the current working directory.
 * Creates any missing parent directories before writing.
 */
export class NodeFileSystemWriter implements IFileSystemWriter {
  /**
   * Writes the given content to the file at the given path.
   * The path is resolved relative to the current working directory.
   * Creates missing parent directories as needed.
   *
   * @param filePath - The path to the file to write.
   * @param content - The content to write.
   * @throws {FileSystemWriterError} When the write operation fails.
   */
  async write(filePath: string, content: string): Promise<void> {
    const resolved = path.resolve(process.cwd(), filePath);
    try {
      const dir = path.dirname(resolved);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(resolved, content, "utf-8");
    } catch (cause) {
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
