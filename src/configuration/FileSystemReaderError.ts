/**
 * Thrown when a file system read operation fails. Wraps the original error
 * as `cause` so callers can inspect the root failure if needed.
 */
export class FileSystemReaderError extends Error {
  /**
   * Creates a new FileSystemReaderError.
   *
   * @param message - A description of what went wrong.
   * @param cause - The original error thrown by the file system.
   */
  constructor(message: string, cause?: unknown) {
    super(message, { cause });
    this.name = "FileSystemReaderError";
  }
}
