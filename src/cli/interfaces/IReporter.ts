import type { LicenseIndexEntry } from "@licensing/LicenseIndexEntry.js";
import type { TemplateSlot } from "@licensing/TemplateSlot.js";
import type { VerifyReport } from "../../LicenseVerifier.js";

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
   * Renders a plain error message.
   *
   * @param message - The error message to report.
   */
  error(message: string): void;
}
