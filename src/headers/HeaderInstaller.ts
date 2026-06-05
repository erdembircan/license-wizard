import type { IFileSystemReader } from "@configuration/interfaces/IFileSystemReader.js";
import type { IFileSystemWriter } from "@configuration/interfaces/IFileSystemWriter.js";
import { HeaderComposer } from "@headers/HeaderComposer.js";
import type { HeaderPlan } from "@headers/HeaderPlan.js";

export type HeaderProgress = {
  /** The number of files processed so far, including this one. */
  done: number;
  /** The total number of files to process. */
  total: number;
  /** The file just processed. */
  file: string;
};

export type HeaderInstallSummary = {
  /** Files that received a new header or had a drifted one rewritten. */
  written: string[];
  /** Files whose header was already correct and were left untouched. */
  unchanged: string[];
};

/**
 * Writes license headers into a set of source files. For each file it composes
 * the managed block in that file's comment syntax and applies it — adding the
 * header, or replacing a previously written one — and reports progress so the
 * caller can drive a loading bar across what may be many files.
 *
 * Writing is idempotent: a file whose header already matches is recognised and
 * left untouched (and counted as unchanged), so re-running over an unchanged
 * project performs no writes.
 */
export class HeaderInstaller {
  readonly #reader: IFileSystemReader;
  readonly #writer: IFileSystemWriter;

  /**
   * Creates a new HeaderInstaller.
   *
   * @param reader - Reads each file's current content.
   * @param writer - Writes the updated content back.
   */
  constructor(reader: IFileSystemReader, writer: IFileSystemWriter) {
    this.#reader = reader;
    this.#writer = writer;
  }

  /**
   * Applies the header described by `plan` to every file in `files`, writing
   * only those whose content actually changes, and returns which files were
   * written and which were already up to date.
   *
   * @param files - The source file paths to head.
   * @param plan - The license detail, header style, and copyright tokens.
   * @param onProgress - Optional callback invoked after each file is processed.
   */
  async install(
    files: readonly string[],
    plan: HeaderPlan,
    onProgress?: (progress: HeaderProgress) => void,
  ): Promise<HeaderInstallSummary> {
    const composer = new HeaderComposer(plan);
    const summary: HeaderInstallSummary = { written: [], unchanged: [] };

    let done = 0;
    for (const file of files) {
      const existing = await this.#reader.read(file);
      const updated = composer.apply(existing, file);

      if (updated === existing) {
        summary.unchanged.push(file);
      } else {
        await this.#writer.write(file, updated);
        summary.written.push(file);
      }

      done += 1;
      onProgress?.({ done, total: files.length, file });
    }

    return summary;
  }
}
