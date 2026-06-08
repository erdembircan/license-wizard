import type { Answer } from "@cli/Answer.js";
import type { IReporter } from "@cli/interfaces/IReporter.js";
import type { Config } from "@configuration/Config.js";
import type { WizardConfig } from "@configuration/WizardConfig.js";
import type { HeaderVerifier } from "@headers/HeaderVerifier.js";
import type { LicenseVerifier } from "../LicenseVerifier.js";
import type { IWizardMode } from "./IWizardMode.js";

/**
 * The standalone `--verify` run mode. Checks both the on-disk `LICENSE` and
 * every present manifest's declared license against the saved configuration,
 * then — when the configuration opts into source-file headers — checks that
 * surface too. Drift is reconciled by default or, under `--strict`, reported as
 * a failure with a non-zero exit code so the same check can either self-heal or
 * gate a CI pipeline. Failures are written to stderr and set the exit code
 * without throwing.
 */
export class VerifyMode implements IWizardMode {
  readonly #verifier: LicenseVerifier;
  readonly #headerVerifier: HeaderVerifier;
  readonly #config: Config;
  readonly #reporter: IReporter;
  readonly #strict: boolean;

  /**
   * Creates a new VerifyMode.
   *
   * @param verifier - Checks the `LICENSE` file and manifests against the config.
   * @param headerVerifier - Checks the source-file headers against the config.
   * @param config - Re-read to drive the header check when headers are enabled.
   * @param reporter - Renders the verification outcome.
   * @param strict - When true, report drift as a failure instead of fixing it.
   */
  constructor(
    verifier: LicenseVerifier,
    headerVerifier: HeaderVerifier,
    config: Config,
    reporter: IReporter,
    strict: boolean,
  ) {
    this.#verifier = verifier;
    this.#headerVerifier = headerVerifier;
    this.#config = config;
    this.#reporter = reporter;
    this.#strict = strict;
  }

  /**
   * Runs the verification: checks the `LICENSE` and manifests, then the headers
   * when the configuration opts into them. A missing `LICENSE` or configuration
   * is reported as a failure. Returns an empty answer list — its output is
   * surfaced through the reporter.
   */
  async run(): Promise<Answer[]> {
    const fix = !this.#strict;
    const outcome = await this.#verifier.verify({ fix });

    switch (outcome.kind) {
      case "missing-license":
        this.#fail(
          "Cannot verify: no LICENSE file found. Generate one first, e.g. with --license <spdx-id>.",
        );
        return [];
      case "missing-config":
        this.#fail(
          "Cannot verify: no saved configuration found. Save one first with a --save-* flag.",
        );
        return [];
      case "match":
        this.#reporter.verifyMatch(outcome);
        break;
      case "fixed":
        this.#reporter.verifyFixed(outcome);
        break;
      case "mismatch":
        this.#reporter.verifyMismatch(outcome);
        this.#exitWithError();
        break;
    }

    // When the configuration opts into source-file headers, verify that surface
    // too, in the same mode. The config is present here (a missing one returned
    // above), so re-reading it cannot fail.
    const config = await this.#config.read();
    if (config !== null) {
      await this.#verifyHeaders(config, fix);
    }

    return [];
  }

  /**
   * Verifies the source-file headers against the saved configuration, reporting
   * the result and — in strict mode — setting a non-zero exit code on drift.
   * Does nothing when the configuration does not opt into headers.
   *
   * @param config - The saved configuration to verify against.
   * @param fix - Whether to reconcile drift or only report it.
   */
  async #verifyHeaders(config: WizardConfig, fix: boolean): Promise<void> {
    const outcome = await this.#headerVerifier.verify(config, { fix });

    switch (outcome.kind) {
      case "disabled":
        return;
      case "match":
        this.#reporter.headersVerifyMatch(outcome);
        return;
      case "fixed":
        this.#reporter.headersVerifyFixed(outcome);
        return;
      case "mismatch":
        this.#reporter.headersVerifyMismatch(outcome);
        this.#exitWithError();
        return;
    }
  }

  /**
   * Reports an error message through the reporter and sets a non-zero exit code
   * without throwing, so failures surface cleanly to callers and agents.
   *
   * @param message - The error message to report.
   */
  #fail(message: string): void {
    this.#reporter.error(message);
    this.#exitWithError();
  }

  /**
   * Sets a non-zero exit code for a failure the reporter has already described,
   * without throwing.
   */
  #exitWithError(): void {
    process.exitCode = 1;
  }
}
