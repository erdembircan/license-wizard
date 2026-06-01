import { styleText } from "node:util";
import type { IReporter } from "@cli/interfaces/IReporter.js";
import type { TemplateSlot } from "@licensing/TemplateSlot.js";

type Style = Parameters<typeof styleText>[0];

type OutputStream = {
  write(chunk: string): boolean;
  isTTY?: boolean;
};

// styleText sniffs the stream by default; the reporter does its own per-stream
// TTY/NO_COLOR detection and only ever calls styleText once color is wanted, so
// the codes are always emitted here.
const FORCE = { validateStream: false } as const;

/**
 * Renders non-interactive CLI output to the terminal, writing informational
 * output to stdout and errors to stderr. Output is colorized with the Node.js
 * built-in `styleText`, but only when the destination stream is an interactive
 * terminal (and `NO_COLOR`/dumb-terminal are not set) — piped or redirected
 * output, as used by scripts and agents, stays plain text.
 */
export class CliReporter implements IReporter {
  readonly #programName: string;
  readonly #out: OutputStream;
  readonly #err: OutputStream;

  /**
   * Creates a new CliReporter.
   *
   * @param programName - The program name shown in usage and examples.
   * @param out - The stream for informational output; defaults to stdout.
   * @param err - The stream for error output; defaults to stderr.
   */
  constructor(
    programName: string,
    out: OutputStream = process.stdout,
    err: OutputStream = process.stderr,
  ) {
    this.#programName = programName;
    this.#out = out;
    this.#err = err;
  }

  /**
   * Renders the usage screen to stdout.
   */
  usage(options: string): void {
    const header = this.#paint(this.#out, "bold", "Usage:");
    const name = this.#paint(this.#out, ["bold", "blue"], this.#programName);
    const label = this.#paint(this.#out, "bold", "Options:");
    this.#out.write(`${header} ${name} [options]\n\n${label}\n${options}\n`);
  }

  /**
   * Renders the copyright fields a license accepts to stdout, with a
   * copy-pasteable `--set` example. When the license has no fields, says so.
   */
  tokens(licenseId: string, slots: TemplateSlot[]): void {
    const id = this.#paint(this.#out, "bold", licenseId);

    if (slots.length === 0) {
      this.#out.write(
        `${id} has no customizable copyright fields; it is generated as official text unchanged.\n`,
      );
      return;
    }

    const list = slots
      .map((slot) => `  ${this.#paint(this.#out, "cyan", slot.label)}`)
      .join("\n");
    const example = this.#paint(
      this.#out,
      "dim",
      `${this.#programName} --license ${licenseId} ${this.#setExample(slots)}`,
    );

    this.#out.write(
      `${id} accepts the following copyright field(s):\n\n${list}\n\n` +
        `Generate a customized license by supplying every field, e.g.:\n\n` +
        `  ${example}\n\n` +
        `Omit --set to write the official text unchanged.\n`,
    );
  }

  /**
   * Renders the one-line success confirmation to stdout, noting the save
   * location when the selection was persisted.
   */
  generated(licenseId: string, savedTo: string): void {
    const mark = this.#mark(this.#out, "✓", "green");
    const id = this.#paint(this.#out, "bold", licenseId);
    const savedNote =
      savedTo === ""
        ? ""
        : ` Saved config to ${this.#paint(this.#out, "cyan", savedTo)}.`;
    this.#out.write(
      `${mark}Wrote LICENSE (${id}) and recorded it in the project manifests.${savedNote}\n`,
    );
  }

  /**
   * Renders the missing-required-fields error to stderr.
   */
  missingFields(licenseId: string, missing: TemplateSlot[]): void {
    const heading = this.#paint(
      this.#err,
      ["bold", "red"],
      `Cannot generate a customized ${licenseId} license: missing required field(s):`,
    );
    const list = missing
      .map((slot) => `  ${this.#paint(this.#err, "yellow", slot.label)}`)
      .join("\n");
    const example = this.#paint(this.#err, "dim", this.#setExample(missing));

    this.#err.write(
      `${this.#mark(this.#err, "✗", "red")}${heading}\n\n${list}\n\n` +
        `Supply every field (e.g. ${example}), or run with --get-tokens to list them all.\n`,
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
    const heading = this.#paint(
      this.#err,
      ["bold", "red"],
      `Unknown copyright field(s) for ${licenseId}:`,
    );
    const unknownList = unknown
      .map((field) => this.#paint(this.#err, "yellow", field))
      .join(", ");
    const accepted =
      slots.length === 0
        ? `${licenseId} has no customizable copyright fields.`
        : `${licenseId} accepts: ${slots
            .map((slot) => this.#paint(this.#err, "cyan", slot.label))
            .join(", ")}.`;

    this.#err.write(
      `${this.#mark(this.#err, "✗", "red")}${heading} ${unknownList}.\n` +
        `${accepted}\nRun with --get-tokens to list them.\n`,
    );
  }

  /**
   * Renders a plain error message to stderr.
   */
  error(message: string): void {
    this.#err.write(`${this.#mark(this.#err, "✗", "red")}${message}\n`);
  }

  /**
   * Builds a `--set "label=<value>"` example spanning the given slots.
   */
  #setExample(slots: TemplateSlot[]): string {
    return slots.map((slot) => `--set "${slot.label}=<value>"`).join(" ");
  }

  /**
   * Returns the colored status glyph followed by a space when the stream
   * supports color, or an empty string otherwise so plain output is undecorated.
   */
  #mark(stream: OutputStream, glyph: string, color: Style): string {
    return this.#useColor(stream) ? `${styleText(color, glyph, FORCE)} ` : "";
  }

  /**
   * Styles the given text for the stream when it supports color, otherwise
   * returns it unchanged.
   */
  #paint(stream: OutputStream, styles: Style, text: string): string {
    return this.#useColor(stream) ? styleText(styles, text, FORCE) : text;
  }

  /**
   * Reports whether the given stream can display ANSI color: it must be an
   * interactive terminal, with neither `NO_COLOR` nor a dumb terminal set. Piped
   * or redirected streams (scripts, agents) return false and stay plain.
   */
  #useColor(stream: OutputStream): boolean {
    return (
      stream.isTTY === true &&
      !process.env.NO_COLOR &&
      process.env.TERM !== "dumb"
    );
  }
}
