import type { HeaderStyle } from "@headers/HeaderPlan.js";
import type { HeaderVerifyReport } from "@headers/HeaderVerifier.js";
import type { LicenseIndexEntry } from "@licensing/LicenseIndexEntry.js";
import type { TemplateSlot } from "@licensing/TemplateSlot.js";
import type { ConfigSave } from "../../LicenseInstaller.js";
import type { VerifyReport } from "../../LicenseVerifier.js";

export type DryRunReport = {
  licenseId: string;
  content: string;
  save: ConfigSave;
  manifests: string[];
};

export type HeaderGenerateReport = {
  licenseId: string;
  style: HeaderStyle;
  total: number;
  written: number;
  unchanged: number;
};

export type HeaderDryRunReport = {
  licenseId: string;
  style: HeaderStyle;
  files: string[];
  sample: string;
};

export type HeaderRemoveReport = {
  /** Files a managed header was (or would be) stripped from. */
  removed: string[];
  /** The total number of source files examined. */
  total: number;
};

/**
 * Contract for rendering non-interactive CLI output to the terminal — the usage
 * screen, generation results, field listings, and error messages.
 */
export interface IReporter {
  /**
   * Renders the usage screen: the program invocation followed by the given
   * formatted flag listing.
   *
   * @param options - The formatted flag listing to display under "Options:".
   */
  usage(options: string): void;

  /**
   * Renders the customizable copyright fields a license accepts, with a
   * copy-pasteable `--set` example. When the license has no fields, says so.
   *
   * @param licenseId - The SPDX identifier being described.
   * @param slots - The license's customizable copyright slots.
   */
  tokens(licenseId: string, slots: TemplateSlot[]): void;

  /**
   * Renders the one-line confirmation printed after a successful generation.
   *
   * @param licenseId - The SPDX identifier that was generated.
   * @param savedTo - The config location the selection was saved to, or the
   *   empty string when nothing was saved.
   */
  generated(licenseId: string, savedTo: string): void;

  /**
   * Renders the dry-run preview: the license text that would have been written,
   * followed by a summary of every write that was skipped — the `LICENSE` file,
   * the project manifests that would have recorded the selection, and the config
   * save location, if any.
   *
   * @param report - The rendered license and the writes that were skipped.
   */
  dryRun(report: DryRunReport): void;

  /**
   * Renders the error shown when a customized generation is missing required
   * copyright fields.
   *
   * @param licenseId - The SPDX identifier being generated.
   * @param missing - The slots still awaiting a value.
   */
  missingFields(licenseId: string, missing: TemplateSlot[]): void;

  /**
   * Renders the error shown when supplied fields do not belong to the license.
   *
   * @param licenseId - The SPDX identifier being generated.
   * @param unknown - The supplied field names that matched no slot.
   * @param slots - The license's customizable copyright slots.
   */
  unknownFields(
    licenseId: string,
    unknown: string[],
    slots: TemplateSlot[],
  ): void;

  /**
   * Renders the error shown when the requested license identifier does not
   * exist, offering the closest available identifiers as suggestions.
   *
   * @param licenseId - The unrecognized SPDX identifier the user requested.
   * @param suggestions - The closest available licenses, ranked best-first; may
   *   be empty when nothing resembles the request.
   */
  licenseNotFound(licenseId: string, suggestions: LicenseIndexEntry[]): void;

  /**
   * Renders the confirmation shown when `--verify` finds the `LICENSE` file and
   * every project manifest already match the saved configuration.
   *
   * @param report - The verification result; everything is in sync.
   */
  verifyMatch(report: VerifyReport): void;

  /**
   * Renders the notice shown when `--verify` found drift and reconciled it —
   * rewriting the `LICENSE` file and/or updating manifest license fields to
   * match the saved configuration.
   *
   * @param report - The verification result; lists what was reconciled.
   */
  verifyFixed(report: VerifyReport): void;

  /**
   * Renders the error shown when `--verify --strict` found the `LICENSE` file
   * or a manifest out of sync with the saved configuration and left it
   * untouched.
   *
   * @param report - The verification result; lists what drifted.
   */
  verifyMismatch(report: VerifyReport): void;

  /**
   * Renders the notice shown when header writing was requested but the scan
   * found no eligible source files to write into.
   *
   * @param licenseId - The SPDX identifier whose header was requested.
   */
  headersNoFiles(licenseId: string): void;

  /**
   * Renders the confirmation printed after headers are written, summarizing how
   * many of the scanned files received a header and how many were already up to
   * date.
   *
   * @param report - The header style and per-file write tally.
   */
  headersGenerated(report: HeaderGenerateReport): void;

  /**
   * Renders the header dry-run preview: an example of the block that would be
   * written and the list of files it would be written into, with nothing
   * touched.
   *
   * @param report - The header style, sample block, and target file list.
   */
  headersDryRun(report: HeaderDryRunReport): void;

  /**
   * Renders the confirmation printed after `--remove-headers` strips wizard
   * headers: how many of the scanned files had a header removed, or that none
   * were found.
   *
   * @param report - The stripped-file list and total examined.
   */
  headersRemoved(report: HeaderRemoveReport): void;

  /**
   * Renders the removal dry-run preview: the files a managed header would be
   * stripped from, with nothing touched.
   *
   * @param report - The would-be-stripped file list and total examined.
   */
  headersRemoveDryRun(report: HeaderRemoveReport): void;

  /**
   * Renders the confirmation shown when `--verify` finds every in-scope source
   * file already carries the configured header.
   *
   * @param report - The header verification result; everything is in sync.
   */
  headersVerifyMatch(report: HeaderVerifyReport): void;

  /**
   * Renders the notice shown when `--verify` found source files missing or
   * carrying a drifted header and rewrote them to match the configuration.
   *
   * @param report - The header verification result; lists what was reconciled.
   */
  headersVerifyFixed(report: HeaderVerifyReport): void;

  /**
   * Renders the error shown when `--verify --strict` found source files missing
   * or carrying a drifted header and left them untouched.
   *
   * @param report - The header verification result; lists what drifted.
   */
  headersVerifyMismatch(report: HeaderVerifyReport): void;

  /**
   * Renders a plain error message.
   *
   * @param message - The error message to report.
   */
  error(message: string): void;
}
