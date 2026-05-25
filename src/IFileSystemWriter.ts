/**
 * Contract for writing to the file system.
 */
export interface IFileSystemWriter {
  /**
   * Writes the given content to the file at the given path.
   *
   * @param path - The path to the file to write.
   * @param content - The content to write.
   */
  write(path: string, content: string): Promise<void>;
}
