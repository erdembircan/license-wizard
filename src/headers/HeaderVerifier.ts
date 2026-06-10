/*
 * SPDX-License-Identifier: Apache-2.0
 * SPDX-FileCopyrightText: 2026 Erdem Bircan
 * license-wizard managed-header v1 Apache-2.0 short 74d1a0534fa2
 */

import type { IFileSystemReader } from "@configuration/interfaces/IFileSystemReader.js";
import type { IFileSystemWriter } from "@configuration/interfaces/IFileSystemWriter.js";
import type { WizardConfig } from "@configuration/WizardConfig.js";
import { HeaderComposer } from "@headers/HeaderComposer.js";
import type { HeaderPlan, HeaderStyle } from "@headers/HeaderPlan.js";
import { parseMarker } from "@headers/HeaderMarker.js";
import { SourceFile } from "@headers/SourceFile.js";
import type { SourceFileScanner } from "@headers/SourceFileScanner.js";
import type { LicenseRepository } from "@licensing/LicenseRepository.js";

/**
 * Why a managed header no longer matches the configuration:
 *
 * - `outdated` — the block faithfully describes an earlier selection (a
 *   different license, style, or copyright). Its marker still matches its own
 *   body; only the configuration moved on.
 * - `edited` — the block's marker claims the current selection, yet the file
 *   does not match what that selection would write, so the block was altered by
 *   hand after the wizard wrote it.
 * - `unknown` — the block carries the wizard's marker token but the marker line
 *   could not be parsed, so its declared selection is unavailable.
 */
export type HeaderDriftReason = "outdated" | "edited" | "unknown";

export type HeaderDrift = {
  file: string;
  /** What the stale block's marker declares, or null when it could not be parsed. */
  declares: { licenseId: string; style: string } | null;
  reason: HeaderDriftReason;
};

export type HeaderVerifyOptions = {
  /**
   * When source files have drifted from the configured header, rewrite them to
   * match (`true`, the default) or leave them untouched and only report the
   * drift (`false`, strict/CI mode).
   */
  fix: boolean;
};

export type HeaderVerifyStatus = "match" | "fixed" | "mismatch";

export type HeaderVerifyReport = {
  licenseId: string;
  style: HeaderStyle;
  total: number;
  /** Files whose managed header already matched the configuration. */
  matched: string[];
  /** Files carrying no wizard header. */
  missing: string[];
  /** Files carrying a wizard header that no longer matches the configuration. */
  drifted: HeaderDrift[];
  /** Files rewritten during a fixing run (the reconciled `missing` + `drifted`). */
  fixed: string[];
  /**
   * Files left untouched because the wizard cannot safely head them — they carry
   * a foreign (non-wizard) license notice, or are PHP files whose header can't be
   * placed inside their tags. The installer already refuses to write these, so
   * the verifier (whose fixing run is on by default) must not write them either.
   */
  skipped: string[];
};

export type HeaderVerifyOutcome =
  | { kind: "disabled" }
  | ({ kind: HeaderVerifyStatus } & HeaderVerifyReport);

/**
 * Verifies that the project's source files still carry the header its saved
 * configuration describes — the header counterpart to {@link LicenseVerifier}.
 * It runs only when the configuration opts into headers; otherwise it reports
 * `disabled` and the surface is simply not checked.
 *
 * Verification re-derives the expected header from the configuration (the single
 * source of truth) and the same scan the writer used, then classifies every
 * source file: already matching, carrying a drifted wizard header, or carrying
 * none at all. Drift and absence are either reconciled (the default — rewriting
 * each file to match) or left untouched and reported as a failure (strict mode),
 * so the check can self-heal or gate a CI pipeline, exactly as the LICENSE check
 * does.
 */
export class HeaderVerifier {
  readonly #scanner: SourceFileScanner;
  readonly #reader: IFileSystemReader;
  readonly #writer: IFileSystemWriter;
  readonly #licenses: LicenseRepository;

  /**
   * Creates a new HeaderVerifier.
   *
   * @param scanner - Re-discovers the source files in scope.
   * @param reader - Reads each file's current content.
   * @param writer - Rewrites drifted files when fixing.
   * @param licenses - Fetches the configured license's header detail.
   */
  constructor(
    scanner: SourceFileScanner,
    reader: IFileSystemReader,
    writer: IFileSystemWriter,
    licenses: LicenseRepository,
  ) {
    this.#scanner = scanner;
    this.#reader = reader;
    this.#writer = writer;
    this.#licenses = licenses;
  }

  /**
   * Checks every in-scope source file against the header described by the saved
   * configuration and reports the result. Returns `disabled` when the
   * configuration does not opt into headers. Otherwise the `kind` aggregates the
   * files: `match` when all already carry the correct header, `fixed` when drift
   * or absence was found and reconciled (the default), or `mismatch` when it was
   * found and left untouched because `fix` was disabled.
   *
   * @param config - The saved configuration to verify against.
   * @param options - Whether drift should be reconciled or only reported.
   */
  async verify(
    config: WizardConfig,
    options: HeaderVerifyOptions,
  ): Promise<HeaderVerifyOutcome> {
    if (!config.headers) {
      return { kind: "disabled" };
    }

    const detail = await this.#licenses.getLicense(config.licenseId);
    const plan: HeaderPlan = {
      detail,
      style: config.headers.style,
      tokens: config.tokens ?? {},
    };
    const composer = new HeaderComposer(plan);
    // Re-scan with the same ignore scope the headers were installed under, so a
    // project headed with `--headers-ignore` isn't re-headed into the excluded
    // files on a fixing verify run.
    const files = await this.#scanner.scan({
      extraIgnores: config.headers.ignore ?? [],
    });

    const report: HeaderVerifyReport = {
      licenseId: config.licenseId,
      style: config.headers.style,
      total: files.length,
      matched: [],
      missing: [],
      drifted: [],
      fixed: [],
      skipped: [],
    };

    for (const file of files) {
      await this.#classify(file, composer, options.fix, report);
    }

    return { kind: this.#aggregate(report, options.fix), ...report };
  }

  /**
   * Classifies one file against the expected header, recording it as matched,
   * missing, or drifted, and — when fixing — rewriting it and recording the
   * write.
   */
  async #classify(
    file: string,
    composer: HeaderComposer,
    fix: boolean,
    report: HeaderVerifyReport,
  ): Promise<void> {
    const existing = await this.#reader.read(file);
    const source = new SourceFile(existing, file);

    // A file the wizard wouldn't write in the first place must not be written
    // here either: skip a foreign-notice or unplaceable file (when it isn't
    // already one of ours) rather than stamp a header over it under fix mode.
    if (
      !composer.hasManaged(existing) &&
      (source.hasForeignLicenseNotice() || !source.canPlaceHeader())
    ) {
      report.skipped.push(file);
      return;
    }

    if (!composer.hasManaged(existing)) {
      report.missing.push(file);
    } else if (composer.apply(existing, file) === existing) {
      report.matched.push(file);
      return;
    } else {
      report.drifted.push(
        this.#describeDrift(file, existing, composer, report),
      );
    }

    if (fix) {
      await this.#writer.write(file, composer.apply(existing, file));
      report.fixed.push(file);
    }
  }

  /**
   * Describes a drifted file for the report. The byte-for-byte comparison has
   * already established that the block does not match the expected output; this
   * reads the stale block's own marker to record what it declares and to explain
   * the drift — a block faithfully describing an earlier selection is `outdated`,
   * while one whose marker still claims the current selection was `edited` by
   * hand. The marker is parsed straight from the file content, which yields the
   * first (and only) managed block's fields.
   */
  #describeDrift(
    file: string,
    existing: string,
    composer: HeaderComposer,
    report: HeaderVerifyReport,
  ): HeaderDrift {
    const declared = parseMarker(existing);
    if (declared === null) {
      return { file, declares: null, reason: "unknown" };
    }

    const declaresCurrent =
      declared.licenseId === report.licenseId &&
      declared.style === report.style &&
      declared.hash === composer.fingerprint();

    return {
      file,
      declares: { licenseId: declared.licenseId, style: declared.style },
      reason: declaresCurrent ? "edited" : "outdated",
    };
  }

  /**
   * Reduces a report to a single status: everything already correct is `match`;
   * any outstanding gap is `fixed` when it was reconciled or `mismatch` when it
   * was left untouched.
   */
  #aggregate(report: HeaderVerifyReport, fix: boolean): HeaderVerifyStatus {
    if (report.missing.length === 0 && report.drifted.length === 0) {
      return "match";
    }
    return fix ? "fixed" : "mismatch";
  }
}
