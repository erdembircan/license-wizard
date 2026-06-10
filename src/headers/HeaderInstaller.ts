/*
 * SPDX-License-Identifier: Apache-2.0
 * SPDX-FileCopyrightText: 2026 Erdem Bircan
 * license-wizard managed-header v1 Apache-2.0 short 74d1a0534fa2
 */

import type { IFileSystemReader } from "@configuration/interfaces/IFileSystemReader.js";
import type { IFileSystemWriter } from "@configuration/interfaces/IFileSystemWriter.js";
import { HeaderComposer } from "@headers/HeaderComposer.js";
import type { HeaderPlan } from "@headers/HeaderPlan.js";
import { SourceFile } from "@headers/SourceFile.js";

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
  /**
   * Files left untouched because the wizard cannot safely head them: they
   * already carry a foreign (non-wizard) license notice it will not prepend a
   * second header over, or they are PHP files whose first meaningful content is
   * not a `<?php` tag, where a header would land outside any PHP tag and be
   * served as page output.
   */
  skipped: string[];
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
    const summary: HeaderInstallSummary = {
      written: [],
      unchanged: [],
      skipped: [],
    };

    let done = 0;
    for (const file of files) {
      const existing = await this.#reader.read(file);

      const source = new SourceFile(existing, file);

      // Never prepend a second declaration over a file that already carries a
      // foreign license notice — that would leave it self-contradicting. The
      // wizard's own blocks are excluded by this test, so re-heading a file it
      // wrote (or switching its license) still goes through below. Likewise skip
      // a file the header can't be safely placed in (a PHP template that opens
      // with HTML, where the block would leak to the page) rather than corrupt
      // its output.
      if (!source.canPlaceHeader() || source.hasForeignLicenseNotice()) {
        summary.skipped.push(file);
        done += 1;
        onProgress?.({ done, total: files.length, file });
        continue;
      }

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
