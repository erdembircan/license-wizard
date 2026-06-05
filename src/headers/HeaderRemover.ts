import type { IFileSystemReader } from "@configuration/interfaces/IFileSystemReader.js";
import type { IFileSystemWriter } from "@configuration/interfaces/IFileSystemWriter.js";
import type { HeaderProgress } from "@headers/HeaderInstaller.js";
import { HeaderStripper } from "@headers/HeaderStripper.js";

export type HeaderRemoveSummary = {
  /** Files a managed header was stripped from. */
  removed: string[];
  /** The total number of files examined. */
  total: number;
};

/**
 * Removes wizard-written license headers from a set of source files — the
 * counterpart to {@link HeaderInstaller}. For each file it strips any managed
 * block and writes the result back, leaving files that carry no header (and
 * files unchanged by the strip) untouched, and reports progress so the caller
 * can drive a loading bar across what may be many files.
 *
 * Removal is unconditional with respect to drift: a managed header is taken out
 * whether or not it matches the saved configuration. Verification is a separate
 * concern — this only deletes.
 */
export class HeaderRemover {
  readonly #reader: IFileSystemReader;
  readonly #writer: IFileSystemWriter;
  readonly #stripper = new HeaderStripper();

  /**
   * Creates a new HeaderRemover.
   *
   * @param reader - Reads each file's current content.
   * @param writer - Writes the stripped content back.
   */
  constructor(reader: IFileSystemReader, writer: IFileSystemWriter) {
    this.#reader = reader;
    this.#writer = writer;
  }

  /**
   * Strips a managed header from every file in `files` that has one, writing
   * back only the files that change, and returns which files were stripped and
   * how many were examined.
   *
   * @param files - The source file paths to clear.
   * @param onProgress - Optional callback invoked after each file is processed.
   */
  async remove(
    files: readonly string[],
    onProgress?: (progress: HeaderProgress) => void,
  ): Promise<HeaderRemoveSummary> {
    const removed: string[] = [];

    let done = 0;
    for (const file of files) {
      const existing = await this.#reader.read(file);
      const { content, removed: didRemove } = this.#stripper.strip(
        existing,
        file,
      );

      if (didRemove && content !== existing) {
        await this.#writer.write(file, content);
        removed.push(file);
      }

      done += 1;
      onProgress?.({ done, total: files.length, file });
    }

    return { removed, total: files.length };
  }
}
