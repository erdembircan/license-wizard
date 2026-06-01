import type { IReporter } from "@cli/interfaces/IReporter.js";
import type { TemplateSlot } from "@licensing/TemplateSlot.js";

/**
 * Renders non-interactive CLI output to the terminal, writing informational
 * output to stdout and errors to stderr.
 */
export class CliReporter implements IReporter {
  readonly #programName: string;

  /**
   * Creates a new CliReporter.
   *
   * @param programName - The program name shown in usage and examples.
   */
  constructor(programName: string) {
    this.#programName = programName;
  }

  /**
   * Renders the usage screen to stdout.
   */
  usage(options: string): void {
    process.stdout.write(
      `Usage: ${this.#programName} [options]\n\nOptions:\n${options}\n`,
    );
  }

  /**
   * Renders the copyright fields a license accepts to stdout, with a
   * copy-pasteable `--set` example. When the license has no fields, says so.
   */
  tokens(licenseId: string, slots: TemplateSlot[]): void {
    if (slots.length === 0) {
      process.stdout.write(
        `${licenseId} has no customizable copyright fields; it is generated as official text unchanged.\n`,
      );
      return;
    }

    const list = slots.map((slot) => `  ${slot.label}`).join("\n");

    process.stdout.write(
      `${licenseId} accepts the following copyright field(s):\n\n${list}\n\n` +
        `Generate a customized license by supplying every field, e.g.:\n\n` +
        `  ${this.#programName} --license ${licenseId} ${this.#setExample(slots)}\n\n` +
        `Omit --set to write the official text unchanged.\n`,
    );
  }

  /**
   * Renders the one-line success confirmation to stdout, noting the save
   * location when the selection was persisted.
   */
  generated(licenseId: string, savedTo: string): void {
    const savedNote = savedTo === "" ? "" : ` Saved config to ${savedTo}.`;
    process.stdout.write(
      `Wrote LICENSE (${licenseId}) and recorded it in the project manifests.${savedNote}\n`,
    );
  }

  /**
   * Renders the missing-required-fields error to stderr.
   */
  missingFields(licenseId: string, missing: TemplateSlot[]): void {
    const missingList = missing.map((slot) => `  ${slot.label}`).join("\n");

    process.stderr.write(
      `Cannot generate a customized ${licenseId} license: missing required field(s):\n\n` +
        `${missingList}\n\n` +
        `Supply every field (e.g. ${this.#setExample(missing)}), or run with --get-tokens to list them all.\n`,
    );
  }

  /**
   * Renders the unknown-fields error to stderr.
   */
  unknownFields(
    licenseId: string,
    unknown: string[],
    slots: TemplateSlot[],
  ): void {
    const accepted =
      slots.length === 0
        ? `${licenseId} has no customizable copyright fields.`
        : `${licenseId} accepts: ${slots.map((slot) => slot.label).join(", ")}.`;

    process.stderr.write(
      `Unknown copyright field(s) for ${licenseId}: ${unknown.join(", ")}.\n` +
        `${accepted}\nRun with --get-tokens to list them.\n`,
    );
  }

  /**
   * Renders a plain error message to stderr.
   */
  error(message: string): void {
    process.stderr.write(`${message}\n`);
  }

  /**
   * Builds a `--set "label=<value>"` example spanning the given slots.
   */
  #setExample(slots: TemplateSlot[]): string {
    return slots.map((slot) => `--set "${slot.label}=<value>"`).join(" ");
  }
}
