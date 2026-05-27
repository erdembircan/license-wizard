import fs from "node:fs/promises";
import type { IFileSystemReader } from "@configuration/interfaces/IFileSystemReader.js";
import { FileSystemReaderError } from "@configuration/errors/FileSystemReaderError.js";

/**
 * File system reader backed by native Node.js `fs/promises`.
 */
export class NodeFileSystemReader implements IFileSystemReader {
  /**
   * Reads the contents of the file at the given path.
   *
   * @param path - The path to the file to read.
   * @throws {FileSystemReaderError} When the read operation fails.
   */
  async read(path: string): Promise<string> {
    try {
      return await fs.readFile(path, "utf-8");
    } catch (cause) {
      throw new FileSystemReaderError(`Failed to read file: ${path}`, cause);
    }
  }

  /**
   * Returns whether a file exists at the given path.
   *
   * @param path - The path to check.
   * @throws {FileSystemReaderError} When the existence check fails unexpectedly.
   */
  async exists(path: string): Promise<boolean> {
    try {
      await fs.access(path);
      return true;
    } catch (cause) {
      const err = cause as NodeJS.ErrnoException;
      if (err.code === "ENOENT") {
        return false;
      }
      throw new FileSystemReaderError(
        `Failed to check existence of file: ${path}`,
        cause,
      );
    }
  }
}
