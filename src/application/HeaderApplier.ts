/*
 * SPDX-License-Identifier: Apache-2.0
 * SPDX-FileCopyrightText: 2026 Erdem Bircan
 * license-wizard managed-header v1 Apache-2.0 short 74d1a0534fa2
 */

import path from "node:path";
import { ProgressBar } from "@cli/ProgressBar.js";
import type { IFileSystemReader } from "@configuration/interfaces/IFileSystemReader.js";
import type { IPathResolver } from "@configuration/interfaces/IPathResolver.js";
import type { IFileSystemWriter } from "@configuration/interfaces/IFileSystemWriter.js";
import { HeaderComposer } from "@headers/HeaderComposer.js";
import { HeaderInstaller } from "@headers/HeaderInstaller.js";
import type {
  HeaderComment,
  HeaderPlan,
  HeaderStyle,
} from "@headers/HeaderPlan.js";
import { HeaderRemover } from "@headers/HeaderRemover.js";
import { NodeFileTreeWalker } from "@headers/NodeFileTreeWalker.js";
import { SourceFile } from "@headers/SourceFile.js";
import {
  SourceFileScanner,
  SUPPORTED_EXTENSIONS,
} from "@headers/SourceFileScanner.js";
import type { LicenseRepository } from "@licensing/LicenseRepository.js";

/**
 * Reports whether `target` resolves to a location inside `base`. Both are
 * expected to be absolute, real (symlink-resolved) paths; the target is inside
 * when the relative step from base to it neither climbs out (`..`) nor jumps to
 * another root (absolute).
 */
function isWithin(base: string, target: string): boolean {
  const rel = path.relative(base, target);
  return (
    rel === "" ||
    (rel !== ".." && !rel.startsWith(`..${path.sep}`) && !path.isAbsolute(rel))
  );
}

export type HeaderApplyReport = {
  licenseId: string;
  style: HeaderStyle;
  total: number;
  written: number;
  unchanged: number;
  /**
   * Paths the header could not be safely written into — a file carrying a
   * foreign license notice, or an unplaceable PHP template. Surfaced as the full
   * list (not just a count) so the caller can inspect, fix, or force-header each.
   */
  skipped: string[];
};

export type HeaderPreview = {
  /** The eligible source files the header would be written into. */
  files: string[];
  /**
   * The scanned files the header would be skipped on — the dry-run counterpart
   * of {@link HeaderApplyReport.skipped}.
   */
  skipped: string[];
  /** A sample header block rendered in the comment style of the first file. */
  sample: string;
};

export type HeaderForceReport = {
  licenseId: string;
  style: HeaderStyle;
  /** The path the header was forced into, exactly as the caller supplied it. */
  file: string;
  /**
   * What the forced write did:
   * - `written` — the header was placed (or rewritten) into the file.
   * - `unchanged` — the file already carried the exact header.
   * - `missing` — no file exists at the given path.
   * - `unsupported` — the file's extension is not one the wizard heads, so a
   *   header would be wrapped in a comment style that doesn't fit it.
   * - `outside` — the path resolves (through a symlinked directory) to a
   *   location outside the project, so writing it is refused.
   */
  outcome: "written" | "unchanged" | "missing" | "unsupported" | "outside";
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
  readonly #reader: IFileSystemReader & IPathResolver;
  readonly #writer: IFileSystemWriter;
  #scannerInstance: SourceFileScanner | null = null;
  #installerInstance: HeaderInstaller | null = null;
  #removerInstance: HeaderRemover | null = null;

  /**
   * Creates a new HeaderApplier.
   *
   * @param licenses - Fetches the license detail whose header is rendered.
   * @param reader - Reads source files (and `.gitignore`) during scans, and
   *   resolves real paths so the force-apply override can confine its write to
   *   the project.
   * @param writer - Writes headers into, and strips them from, source files.
   */
  constructor(
    licenses: LicenseRepository,
    reader: IFileSystemReader & IPathResolver,
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
   * @param comment - The comment delimiter (`block` or `docblock`).
   * @param tokens - Copyright tokens inherited from the license customization.
   * @param extraIgnores - Extra gitignore-style patterns to skip while scanning.
   */
  async apply(
    licenseId: string,
    style: HeaderStyle,
    comment: HeaderComment,
    tokens: Record<string, string>,
    extraIgnores: string[],
  ): Promise<HeaderApplyReport> {
    const detail = await this.#licenses.getLicense(licenseId);
    const files = await this.#scanner.scan({ extraIgnores });

    if (files.length === 0) {
      return {
        licenseId,
        style,
        total: 0,
        written: 0,
        unchanged: 0,
        skipped: [],
      };
    }

    const plan: HeaderPlan = { detail, style, comment, tokens };
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
      skipped: summary.skipped,
    };
  }

  /**
   * Scans for eligible source files and partitions them into those that would
   * receive a header and those the writer would skip — applying the same safety
   * guard a real run does, so the dry run reflects exactly what would happen —
   * plus a sample block rendered in the comment style of the first file. Writes
   * nothing. Returns null when the scan finds no eligible files.
   *
   * @param licenseId - The SPDX identifier whose header would be written.
   * @param style - The header style (`short` or `full`).
   * @param comment - The comment delimiter (`block` or `docblock`).
   * @param tokens - Copyright tokens inherited from the license customization.
   * @param extraIgnores - Extra gitignore-style patterns to skip while scanning.
   */
  async preview(
    licenseId: string,
    style: HeaderStyle,
    comment: HeaderComment,
    tokens: Record<string, string>,
    extraIgnores: string[],
  ): Promise<HeaderPreview | null> {
    const detail = await this.#licenses.getLicense(licenseId);
    const files = await this.#scanner.scan({ extraIgnores });

    if (files.length === 0) {
      return null;
    }

    const composer = new HeaderComposer({ detail, style, comment, tokens });
    const writable: string[] = [];
    const skipped: string[] = [];
    for (const file of files) {
      const content = await this.#reader.read(file);
      const source = new SourceFile(content, file);
      // Mirror the writer's guard (see HeaderInstaller.install): a file carrying
      // a foreign notice, or a PHP template the header can't be placed inside, is
      // skipped rather than corrupted — unless it already carries our managed
      // block (e.g. one forced in earlier), which we keep current rather than
      // perpetually re-skipping.
      if (
        !composer.hasManaged(content) &&
        (!source.canPlaceHeader() || source.hasForeignLicenseNotice())
      ) {
        skipped.push(file);
      } else {
        writable.push(file);
      }
    }

    // Render the sample in a file's own comment style — preferring one that would
    // actually be headed, but falling back to a skipped one when every file would
    // be skipped, so the preview still shows the block.
    const sampleFrom = writable[0] ?? skipped[0];
    const sample = composer.block(SourceFile.extensionOf(sampleFrom));
    return { files: writable, skipped, sample };
  }

  /**
   * Forces the requested header into a single named file even though the safety
   * guard would normally skip it — the caller is asserting the file is safe to
   * head. Unlike {@link apply} this targets one path directly rather than scanning,
   * and bypasses the foreign-notice / unplaceable-PHP guard. Writing stays
   * idempotent: a file that already carries the exact header is left untouched.
   * Under `dryRun` the outcome is computed without writing.
   *
   * The override still refuses targets it can't head safely: a file whose
   * extension is not a supported source extension (its content would be wrapped
   * in a comment style that doesn't fit), and a path that resolves — through a
   * symlinked directory — to a location outside the project, which a purely
   * lexical caller-side check cannot see. Resolving the target's parent directory
   * to its real path and confining it to the working directory keeps the write
   * inside the project the wizard was invoked in.
   *
   * @param licenseId - The SPDX identifier whose header is written.
   * @param style - The header style (`short` or `full`).
   * @param comment - The comment delimiter (`block` or `docblock`).
   * @param tokens - Copyright tokens inherited from the saved configuration.
   * @param file - The path to force the header into, relative to the working dir.
   * @param options - `dryRun` computes the outcome without writing.
   */
  async forceApply(
    licenseId: string,
    style: HeaderStyle,
    comment: HeaderComment,
    tokens: Record<string, string>,
    file: string,
    options: { dryRun?: boolean } = {},
  ): Promise<HeaderForceReport> {
    if (!SUPPORTED_EXTENSIONS.includes(SourceFile.extensionOf(file))) {
      return { licenseId, style, file, outcome: "unsupported" };
    }

    if (!(await this.#reader.exists(file))) {
      return { licenseId, style, file, outcome: "missing" };
    }

    // The write lands in the target's parent directory (temp file + rename), so
    // resolve that directory's real path and require it to stay inside the
    // project: a symlinked intermediate directory would otherwise let a
    // lexically-inside path escape — the boundary a caller-side string check
    // cannot enforce.
    const projectRoot = await this.#reader.realPath(".");
    const parent = await this.#reader.realPath(path.dirname(file));
    if (!isWithin(projectRoot, parent)) {
      return { licenseId, style, file, outcome: "outside" };
    }

    const detail = await this.#licenses.getLicense(licenseId);
    const composer = new HeaderComposer({ detail, style, comment, tokens });
    const existing = await this.#reader.read(file);
    const updated = composer.apply(existing, file);

    if (updated === existing) {
      return { licenseId, style, file, outcome: "unchanged" };
    }

    if (!options.dryRun) {
      await this.#writer.write(file, updated);
    }
    return { licenseId, style, file, outcome: "written" };
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
