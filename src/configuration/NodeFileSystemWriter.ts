import fs from "node:fs/promises";
import path from "node:path";
import type { IFileSystemWriter } from "@configuration/interfaces/IFileSystemWriter.js";
import { FileSystemWriterError } from "@configuration/errors/FileSystemWriterError.js";

/**
 * File system writer backed by native Node.js `fs/promises`.
 * Creates any missing parent directories before writing.
 */
export class NodeFileSystemWriter implements IFileSystemWriter {
  /**
   * Writes the given content to the file at the given path.
   * Creates missing parent directories as needed.
   *
   * @param filePath - The path to the file to write.
   * @param content - The content to write.
   * @throws {FileSystemWriterError} When the write operation fails.
   */
  async write(filePath: string, content: string): Promise<void> {
    try {
      const dir = path.dirname(filePath);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(filePath, content, "utf-8");
    } catch (cause) {
      throw new FileSystemWriterError(
        `Failed to write file: ${filePath}`,
        cause,
      );
    }
  }
}
