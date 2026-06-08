import { ProgressBar } from "@cli/ProgressBar.js";
import type { IFileSystemReader } from "@configuration/interfaces/IFileSystemReader.js";
import type { IFileSystemWriter } from "@configuration/interfaces/IFileSystemWriter.js";
import { HeaderComposer } from "@headers/HeaderComposer.js";
import { HeaderInstaller } from "@headers/HeaderInstaller.js";
import type { HeaderPlan, HeaderStyle } from "@headers/HeaderPlan.js";
import { HeaderRemover } from "@headers/HeaderRemover.js";
import { NodeFileTreeWalker } from "@headers/NodeFileTreeWalker.js";
import { SourceFile } from "@headers/SourceFile.js";
import { SourceFileScanner } from "@headers/SourceFileScanner.js";
import type { LicenseRepository } from "@licensing/LicenseRepository.js";

export type HeaderApplyReport = {
  licenseId: string;
  style: HeaderStyle;
  total: number;
  written: number;
  unchanged: number;
};

export type HeaderPreview = {
  /** The eligible source files the header would be written into. */
  files: string[];
  /** A sample header block rendered in the comment style of the first file. */
  sample: string;
};

export type HeaderRemovalReport = {
  /** Files a managed header was (or would be) stripped from. */
  removed: string[];
  /** The total number of source files examined. */
  total: number;
};

/**
 * Application service that owns the source-file header surface: scanning the
 * project for eligible files and writing, previewing, or removing the wizard's
 * SPDX headers across them. Both the interactive and non-interactive modes drive
 * the same header work through this one place, so the scanning and progress
 * mechanics live in exactly one component instead of in each mode.
 *
 * Its scanner, installer, and remover are built lazily, so a run that never
 * touches headers — the common case — never pays to assemble them.
 */
export class HeaderApplier {
  readonly #licenses: LicenseRepository;
  readonly #reader: IFileSystemReader;
  readonly #writer: IFileSystemWriter;
  #scannerInstance: SourceFileScanner | null = null;
  #installerInstance: HeaderInstaller | null = null;
  #removerInstance: HeaderRemover | null = null;

  /**
   * Creates a new HeaderApplier.
   *
   * @param licenses - Fetches the license detail whose header is rendered.
   * @param reader - Reads source files (and `.gitignore`) during scans.
   * @param writer - Writes headers into, and strips them from, source files.
   */
  constructor(
    licenses: LicenseRepository,
    reader: IFileSystemReader,
    writer: IFileSystemWriter,
  ) {
    this.#licenses = licenses;
    this.#reader = reader;
    this.#writer = writer;
  }

  /**
   * Lazily builds and memoizes the source-file scanner.
   */
  get #scanner(): SourceFileScanner {
    return (this.#scannerInstance ??= new SourceFileScanner(
      new NodeFileTreeWalker(),
      this.#reader,
    ));
  }

  /**
   * Lazily builds and memoizes the header installer.
   */
  get #installer(): HeaderInstaller {
    return (this.#installerInstance ??= new HeaderInstaller(
      this.#reader,
      this.#writer,
    ));
  }

  /**
   * Lazily builds and memoizes the header remover.
   */
  get #remover(): HeaderRemover {
    return (this.#removerInstance ??= new HeaderRemover(
      this.#reader,
      this.#writer,
    ));
  }

  /**
   * Scans the project for eligible source files and writes the requested header
   * into each, showing a progress bar across the run, and returns a tally of how
   * many files were written versus already current.
   *
   * @param licenseId - The SPDX identifier whose header is written.
   * @param style - The header style (`short` or `full`).
   * @param tokens - Copyright tokens inherited from the license customization.
   * @param extraIgnores - Extra gitignore-style patterns to skip while scanning.
   */
  async apply(
    licenseId: string,
    style: HeaderStyle,
    tokens: Record<string, string>,
    extraIgnores: string[],
  ): Promise<HeaderApplyReport> {
    const detail = await this.#licenses.getLicense(licenseId);
    const files = await this.#scanner.scan({ extraIgnores });

    if (files.length === 0) {
      return { licenseId, style, total: 0, written: 0, unchanged: 0 };
    }

    const plan: HeaderPlan = { detail, style, tokens };
    const bar = new ProgressBar("  Inscribing headers");
    bar.start(files.length);
    const summary = await this.#installer.install(files, plan, (p) =>
      bar.update(p.done),
    );
    bar.stop();

    return {
      licenseId,
      style,
      total: files.length,
      written: summary.written.length,
      unchanged: summary.unchanged.length,
    };
  }

  /**
   * Scans for eligible source files and returns the files that would receive a
   * header plus a sample block rendered in the comment style of the first one,
   * writing nothing. Returns null when the scan finds no eligible files.
   *
   * @param licenseId - The SPDX identifier whose header would be written.
   * @param style - The header style (`short` or `full`).
   * @param tokens - Copyright tokens inherited from the license customization.
   * @param extraIgnores - Extra gitignore-style patterns to skip while scanning.
   */
  async preview(
    licenseId: string,
    style: HeaderStyle,
    tokens: Record<string, string>,
    extraIgnores: string[],
  ): Promise<HeaderPreview | null> {
    const detail = await this.#licenses.getLicense(licenseId);
    const files = await this.#scanner.scan({ extraIgnores });

    if (files.length === 0) {
      return null;
    }

    const sample = new HeaderComposer({ detail, style, tokens }).block(
      SourceFile.extensionOf(files[0]),
    );
    return { files, sample };
  }

  /**
   * Scans the project for source files and strips any wizard-written header from
   * each, showing a progress bar across the run, and returns a tally of how many
   * files were cleared.
   *
   * @param extraIgnores - Extra gitignore-style patterns to skip while scanning.
   */
  async remove(extraIgnores: string[]): Promise<HeaderRemovalReport> {
    const files = await this.#scanner.scan({ extraIgnores });

    if (files.length === 0) {
      return { removed: [], total: 0 };
    }

    const bar = new ProgressBar("  Removing headers");
    bar.start(files.length);
    const summary = await this.#remover.remove(files, (progress) =>
      bar.update(progress.done),
    );
    bar.stop();

    return summary;
  }

  /**
   * Scans for source files and reports which carry a wizard-written header,
   * touching nothing — the dry-run counterpart of {@link remove}.
   *
   * @param extraIgnores - Extra gitignore-style patterns to skip while scanning.
   */
  async previewRemoval(extraIgnores: string[]): Promise<HeaderRemovalReport> {
    const files = await this.#scanner.scan({ extraIgnores });

    const removed: string[] = [];
    for (const file of files) {
      const content = await this.#reader.read(file);
      if (new SourceFile(content, file).hasManagedHeader()) {
        removed.push(file);
      }
    }

    return { removed, total: files.length };
  }
}
