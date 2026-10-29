/*
 * SPDX-License-Identifier: Apache-2.0
 * SPDX-FileCopyrightText: 2026 Erdem Bircan
 * license-wizard managed-header v1 Apache-2.0 short 74d1a0534fa2
 */

import type { IOutputSink } from "@cli/interfaces/IOutputSink.js";
import type {
  DryRunReport,
  HeaderDryRunReport,
  HeaderForceApplyReport,
  HeaderGenerateReport,
  HeaderRemoveReport,
  IReporter,
  SavedTokensCommand,
} from "@cli/interfaces/IReporter.js";
import type { HeaderDriftNote, VerifyNote } from "@cli/OutputMessage.js";
import type {
  HeaderDrift,
  HeaderVerifyReport,
} from "@headers/HeaderVerifier.js";
import type { LicenseIndexEntry } from "@licensing/LicenseIndexEntry.js";
import type { TemplateSlot } from "@licensing/TemplateSlot.js";
import type {
  UnknownTokensReport,
  VerifyReport,
} from "@application/LicenseVerifier.js";

/**
 * Renders every CLI outcome into a semantic `OutputMessage` and emits it to a
 * sink, performing the view-model work — passing report data through and
 * deriving the decisions behind each line (which surfaces drifted, how many
 * headers were added, how each header drifted) — without any wording, color, or
 * stream knowledge. Wiring this to a terminal sink (see `CliReporter`) prints to
 * the screen; wiring it to a `RecordingSink` captures the data for tests.
 */
export class MessageReporter implements IReporter {
  readonly #sink: IOutputSink;

  /**
   * Creates a new MessageReporter.
   *
   * @param sink - The destination for the emitted view-model messages.
   */
  constructor(sink: IOutputSink) {
    this.#sink = sink;
  }

  usage(options: string): void {
    this.#sink.emit({ kind: "usage", channel: "out", options });
  }

  version(version: string): void {
    this.#sink.emit({ kind: "version", channel: "out", version });
  }

  tokens(licenseId: string, slots: TemplateSlot[]): void {
    this.#sink.emit({ kind: "tokens", channel: "out", licenseId, slots });
  }

  generated(licenseId: string, savedTo: string): void {
    this.#sink.emit({ kind: "generated", channel: "out", licenseId, savedTo });
  }

  dryRun(report: DryRunReport): void {
    this.#sink.emit({
      kind: "dryRun",
      channel: "out",
      licenseId: report.licenseId,
      content: report.content,
      save: report.save,
      manifests: report.manifests,
    });
  }

  missingFields(licenseId: string, missing: TemplateSlot[]): void {
    this.#sink.emit({
      kind: "missingFields",
      channel: "err",
      licenseId,
      missing,
    });
  }

  unknownFields(
    licenseId: string,
    unknown: string[],
    slots: TemplateSlot[],
  ): void {
    this.#sink.emit({
      kind: "unknownFields",
      channel: "err",
      licenseId,
      unknown,
      slots,
    });
  }

  licenseNotFound(licenseId: string, suggestions: LicenseIndexEntry[]): void {
    this.#sink.emit({
      kind: "licenseNotFound",
      channel: "err",
      licenseId,
      suggestions,
    });
  }

  verifyMatch(report: VerifyReport): void {
    this.#sink.emit({
      kind: "verifyMatch",
      channel: "out",
      licenseId: report.licenseId,
      manifestsChecked: report.manifests.length > 0,
    });
  }

  verifyFixed(report: VerifyReport): void {
    this.#sink.emit({
      kind: "verifyFixed",
      channel: "out",
      licenseId: report.licenseId,
      licenseRegenerated: report.license === "fixed",
      manifests: report.manifests
        .filter((manifest) => manifest.status === "fixed")
        .map((manifest) => ({ name: manifest.name, was: manifest.declared })),
      note: this.#verifyNote(report),
    });
  }

  verifyMismatch(report: VerifyReport): void {
    this.#sink.emit({
      kind: "verifyMismatch",
      channel: "err",
      licenseId: report.licenseId,
      licenseMismatch: report.license === "mismatch",
      manifests: report.manifests
        .filter((manifest) => manifest.status === "mismatch")
        .map((manifest) => ({
          name: manifest.name,
          declared: manifest.declared,
        })),
      difference:
        report.license === "mismatch" ? report.licenseDifference : null,
      note: this.#verifyNote(report),
    });
  }

  unknownSavedTokens(
    report: UnknownTokensReport,
    command: SavedTokensCommand,
  ): void {
    this.#sink.emit({
      kind: "unknownSavedTokens",
      channel: "err",
      licenseId: report.licenseId,
      command,
      tokens: report.tokens.unknown,
      fields: report.tokens.fields,
      configFile: report.configFile,
    });
  }

  headersNoFiles(licenseId: string): void {
    this.#sink.emit({ kind: "headersNoFiles", channel: "out", licenseId });
  }

  headersGenerated(report: HeaderGenerateReport): void {
    this.#sink.emit({
      kind: "headersGenerated",
      channel: "out",
      licenseId: report.licenseId,
      style: report.style,
      total: report.total,
      written: report.written,
      unchanged: report.unchanged,
      skipped: report.skipped,
    });
  }

  headersDryRun(report: HeaderDryRunReport): void {
    this.#sink.emit({
      kind: "headersDryRun",
      channel: "out",
      licenseId: report.licenseId,
      style: report.style,
      files: report.files,
      skipped: report.skipped,
      sample: report.sample,
    });
  }

  headersForceApplied(report: HeaderForceApplyReport): void {
    this.#sink.emit({
      kind: "headersForceApplied",
      channel: "out",
      licenseId: report.licenseId,
      style: report.style,
      file: report.file,
      outcome: report.outcome,
      dryRun: report.dryRun,
    });
  }

  headersRemoved(report: HeaderRemoveReport): void {
    this.#sink.emit({
      kind: "headersRemoved",
      channel: "out",
      removed: report.removed,
      total: report.total,
    });
  }

  headersRemoveDryRun(report: HeaderRemoveReport): void {
    this.#sink.emit({
      kind: "headersRemoveDryRun",
      channel: "out",
      removed: report.removed,
      total: report.total,
    });
  }

  headersVerifyMatch(report: HeaderVerifyReport): void {
    this.#sink.emit({
      kind: "headersVerifyMatch",
      channel: "out",
      licenseId: report.licenseId,
      style: report.style,
      total: report.total,
      skipped: report.skipped,
    });
  }

  headersVerifyFixed(report: HeaderVerifyReport): void {
    this.#sink.emit({
      kind: "headersVerifyFixed",
      channel: "out",
      licenseId: report.licenseId,
      style: report.style,
      added: report.missing.length,
      rewritten: report.drifted.length,
      skipped: report.skipped,
    });
  }

  headersVerifyMismatch(report: HeaderVerifyReport): void {
    this.#sink.emit({
      kind: "headersVerifyMismatch",
      channel: "err",
      licenseId: report.licenseId,
      style: report.style,
      missing: report.missing,
      drifted: report.drifted.map((drift) => this.#driftNote(drift)),
    });
  }

  error(message: string): void {
    this.#sink.emit({ kind: "error", channel: "err", message });
  }

  /**
   * Decides whether a note explains a drifted `LICENSE`: one built from SPDX's
   * matching template gets the note that SPDX revises that template between
   * releases, offering to drop the tokens only when no full header needs them.
   * Returns null when the `LICENSE` itself did not drift or was built from the
   * plain text, so a passing run or a manifest-only drift carries no note.
   * Saved tokens that are not copyright fields of the license never reach here:
   * verification stops on them with its own error.
   *
   * @param report - The verification result.
   */
  #verifyNote(report: VerifyReport): VerifyNote | null {
    if (
      report.license === "match" ||
      report.builtFrom !== "standardLicenseTemplate"
    ) {
      return null;
    }
    return {
      kind: "templateBuilt",
      tokens: report.savedTokens,
      configFile: report.configFile,
      offerRemoval: !report.fullHeaders,
    };
  }

  /**
   * Reduces a raw header drift to the decision the presenter needs: a hand-edit,
   * an earlier selection the block still declares, or an unparseable drift.
   *
   * @param drift - The drift detected for a single source file.
   */
  #driftNote(drift: HeaderDrift): HeaderDriftNote {
    if (drift.reason === "edited") {
      return { file: drift.file, kind: "edited" };
    }
    if (drift.declares !== null) {
      return {
        file: drift.file,
        kind: "declares",
        licenseId: drift.declares.licenseId,
        style: drift.declares.style,
      };
    }
    return { file: drift.file, kind: "drifted" };
  }
}
