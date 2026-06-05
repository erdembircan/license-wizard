import { styleText } from "node:util";
import type {
  DryRunReport,
  HeaderDryRunReport,
  HeaderGenerateReport,
  IReporter,
} from "@cli/interfaces/IReporter.js";
import type {
  HeaderDrift,
  HeaderVerifyReport,
} from "@headers/HeaderVerifier.js";
import type { LicenseIndexEntry } from "@licensing/LicenseIndexEntry.js";
import type { TemplateSlot } from "@licensing/TemplateSlot.js";
import type { ManifestCheck, VerifyReport } from "../LicenseVerifier.js";

type Style = Parameters<typeof styleText>[0];

type OutputStream = {
  write(chunk: string): boolean;
  isTTY?: boolean;
};

// styleText sniffs the stream by default; the reporter does its own per-stream
// TTY/NO_COLOR detection and only ever calls styleText once color is wanted, so
// the codes are always emitted here.
const FORCE = { validateStream: false } as const;

// The wizard signs its output with a spark instead of a plain checkbox: a bright
// spark when a spell lands, a faint glimmer when one is only rehearsed (dry run),
// and a fizzle when an incantation fails.
const SPARK = "✦";
const GLIMMER = "✧";
const FIZZLE = "✗";

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
    const mark = this.#mark(this.#out, SPARK, "green");
    const id = this.#paint(this.#out, "bold", licenseId);
    const savedNote =
      savedTo === ""
        ? ""
        : ` Spellbook saved to ${this.#paint(this.#out, "cyan", savedTo)}.`;
    this.#out.write(
      `${mark}Conjured your LICENSE (${id}) and inscribed it across the project manifests.${savedNote}\n`,
    );
  }

  /**
   * Renders the dry-run preview to stdout: the license text that would have
   * been written, followed by a summary of every write that was skipped. No
   * files are touched on this path.
   */
  dryRun(report: DryRunReport): void {
    const mark = this.#mark(this.#out, GLIMMER, "yellow");
    const heading = this.#paint(
      this.#out,
      ["bold", "yellow"],
      "Dry run — the spell was only rehearsed; no files were written.",
    );
    const id = this.#paint(this.#out, "bold", report.licenseId);
    const plan = this.#dryRunPlan(report);

    this.#out.write(
      `${mark}${heading}\n\n` +
        `Would conjure LICENSE (${id}):\n\n${report.content}\n\n` +
        `${plan}\n`,
    );
  }

  /**
   * Builds the indented list of writes a dry run skipped: which project
   * manifests would have recorded the selection and what would have happened to
   * the saved config.
   */
  #dryRunPlan(report: DryRunReport): string {
    const lines: string[] = [];

    const manifests =
      report.manifests.length > 0
        ? report.manifests
            .map((name) => this.#paint(this.#out, "cyan", name))
            .join(", ")
        : "none present";
    lines.push(`  Inscribe ${report.licenseId} in manifests: ${manifests}`);

    if (report.save.action === "save") {
      lines.push(
        `  Save your spellbook to ${this.#paint(this.#out, "cyan", report.save.target)}`,
      );
    } else if (report.save.action === "clear") {
      lines.push("  Banish the spellbook from every location");
    }

    const label = this.#paint(this.#out, "dim", "The spell would also:");
    return `${label}\n${lines.join("\n")}`;
  }

  /**
   * Renders the missing-required-fields error to stderr.
   */
  missingFields(licenseId: string, missing: TemplateSlot[]): void {
    const heading = this.#paint(
      this.#err,
      ["bold", "red"],
      `Cannot conjure a customized ${licenseId} license — missing required field(s):`,
    );
    const list = missing
      .map((slot) => `  ${this.#paint(this.#err, "yellow", slot.label)}`)
      .join("\n");
    const example = this.#paint(this.#err, "dim", this.#setExample(missing));

    this.#err.write(
      `${this.#mark(this.#err, FIZZLE, "red")}${heading}\n\n${list}\n\n` +
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
      `${this.#mark(this.#err, FIZZLE, "red")}${heading} ${unknownList}.\n` +
        `${accepted}\nRun with --get-tokens to list them.\n`,
    );
  }

  /**
   * Renders the unknown-license error to stderr: acknowledges that no license
   * matches the requested identifier and, when any close matches exist, lists
   * the nearest available identifiers with a copy-pasteable `--license` hint.
   */
  licenseNotFound(licenseId: string, suggestions: LicenseIndexEntry[]): void {
    const heading = this.#paint(
      this.#err,
      ["bold", "red"],
      `No license matches "${licenseId}".`,
    );
    const mark = this.#mark(this.#err, FIZZLE, "red");

    if (suggestions.length === 0) {
      this.#err.write(
        `${mark}${heading}\n` +
          `Run ${this.#programName} with no flags to search the full list interactively.\n`,
      );
      return;
    }

    const width = Math.max(...suggestions.map((s) => s.licenseId.length));
    const list = suggestions
      .map((entry) => {
        const id = this.#paint(
          this.#err,
          "cyan",
          entry.licenseId.padEnd(width),
        );
        const name = this.#paint(this.#err, "dim", entry.name);
        return `  ${id}  ${name}`;
      })
      .join("\n");
    const example = this.#paint(
      this.#err,
      "dim",
      `${this.#programName} --license ${suggestions[0].licenseId}`,
    );

    this.#err.write(
      `${mark}${heading} Did you mean one of these?\n\n${list}\n\n` +
        `Re-run with the exact identifier, e.g.:\n\n  ${example}\n`,
    );
  }

  /**
   * Renders the verify "in sync" confirmation to stdout, noting that the
   * manifests were checked too when any are present.
   */
  verifyMatch(report: VerifyReport): void {
    const mark = this.#mark(this.#out, SPARK, "green");
    const id = this.#paint(this.#out, "bold", report.licenseId);
    const surfaces =
      report.manifests.length > 0
        ? "LICENSE and project manifests are"
        : "LICENSE is";
    this.#out.write(
      `${mark}${surfaces} up to date, in harmony with your saved ${id} enchantment.\n`,
    );
  }

  /**
   * Renders the verify "reconciled the drift" notice to stdout, listing each
   * surface that was brought back in sync.
   */
  verifyFixed(report: VerifyReport): void {
    const mark = this.#mark(this.#out, SPARK, "green");
    const id = this.#paint(this.#out, "bold", report.licenseId);
    const list = this.#driftList(this.#out, report, "fixed");
    this.#out.write(
      `${mark}Realigned the project with your saved ${id} enchantment:\n${list}\n`,
    );
  }

  /**
   * Renders the verify mismatch error to stderr, listing every surface that
   * drifted and how to reconcile it.
   */
  verifyMismatch(report: VerifyReport): void {
    const mark = this.#mark(this.#err, FIZZLE, "red");
    const heading = this.#paint(
      this.#err,
      ["bold", "red"],
      `Project is out of sync with your saved ${report.licenseId} enchantment:`,
    );
    const list = this.#driftList(this.#err, report, "mismatch");
    const fix = this.#paint(this.#err, "dim", `${this.#programName} --verify`);
    this.#err.write(
      `${mark}${heading}\n${list}\n` +
        `Run ${fix} to reconcile, or update the configuration to match.\n`,
    );
  }

  /**
   * Builds the indented, per-surface drift listing shared by the verify fixed
   * and mismatch reports — the `LICENSE` file when its status matches the given
   * one, followed by every manifest with that status, each described against the
   * configured identifier.
   */
  #driftList(
    stream: OutputStream,
    report: VerifyReport,
    status: "fixed" | "mismatch",
  ): string {
    const verb =
      status === "fixed"
        ? { license: "regenerated", manifest: "updated" }
        : { license: "does not match", manifest: "declares" };
    const lines: string[] = [];

    if (report.license === status) {
      lines.push(`  LICENSE ${this.#paint(stream, "yellow", verb.license)}`);
    }

    for (const manifest of report.manifests) {
      if (manifest.status !== status) {
        continue;
      }
      const name = this.#paint(stream, "cyan", manifest.name);
      const detail =
        status === "fixed"
          ? `${verb.manifest} to ${report.licenseId}${this.#was(manifest)}`
          : `${verb.manifest} ${this.#declared(manifest)} (expected ${report.licenseId})`;
      lines.push(`  ${name} license ${detail}`);
    }

    return lines.join("\n");
  }

  /**
   * Describes what a drifted manifest previously declared, as a parenthetical
   * suffix for the fixed listing — `(was X)`, or empty when it declared nothing.
   */
  #was(manifest: ManifestCheck): string {
    return manifest.declared === null ? "" : ` (was ${manifest.declared})`;
  }

  /**
   * Describes what a manifest declared for the mismatch listing — the declared
   * identifier, or "no license" when the field is absent.
   */
  #declared(manifest: ManifestCheck): string {
    return manifest.declared === null ? "no license" : manifest.declared;
  }

  /**
   * Renders the notice shown when header writing found no eligible source files.
   */
  headersNoFiles(licenseId: string): void {
    const id = this.#paint(this.#out, "bold", licenseId);
    this.#out.write(
      `No source files to inscribe with the ${id} header — the scan found nothing eligible.\n`,
    );
  }

  /**
   * Renders the one-line confirmation printed after headers are written.
   */
  headersGenerated(report: HeaderGenerateReport): void {
    const mark = this.#mark(this.#out, SPARK, "green");
    const id = this.#paint(this.#out, "bold", report.licenseId);
    const style = this.#paint(this.#out, "cyan", report.style);
    const written = this.#paint(this.#out, "bold", String(report.written));
    const unchanged =
      report.unchanged > 0 ? ` ${report.unchanged} already bore the mark.` : "";
    this.#out.write(
      `${mark}Inscribed the ${id} ${style} header across ${written} of ${report.total} source file(s).${unchanged}\n`,
    );
  }

  /**
   * Renders the header dry-run preview to stdout: the block that would be
   * written and the files it would touch, with nothing changed.
   */
  headersDryRun(report: HeaderDryRunReport): void {
    const mark = this.#mark(this.#out, GLIMMER, "yellow");
    const heading = this.#paint(
      this.#out,
      ["bold", "yellow"],
      "Dry run — no source file was touched.",
    );
    const id = this.#paint(this.#out, "bold", report.licenseId);
    const style = this.#paint(this.#out, "cyan", report.style);
    const list = report.files
      .map((file) => `  ${this.#paint(this.#out, "cyan", file)}`)
      .join("\n");

    this.#out.write(
      `${mark}${heading}\n\n` +
        `Would inscribe the ${id} ${style} header into ${report.files.length} file(s):\n\n` +
        `${report.sample}\n\n${list}\n`,
    );
  }

  /**
   * Renders the header verify "in sync" confirmation to stdout.
   */
  headersVerifyMatch(report: HeaderVerifyReport): void {
    const mark = this.#mark(this.#out, SPARK, "green");
    const id = this.#paint(this.#out, "bold", report.licenseId);
    this.#out.write(
      `${mark}All ${report.total} source file(s) bear the expected ${id} ${report.style} header.\n`,
    );
  }

  /**
   * Renders the header verify "reconciled the drift" notice to stdout.
   */
  headersVerifyFixed(report: HeaderVerifyReport): void {
    const mark = this.#mark(this.#out, SPARK, "green");
    const id = this.#paint(this.#out, "bold", report.licenseId);
    const added = report.missing.length;
    const rewritten = report.drifted.length;
    this.#out.write(
      `${mark}Realigned the ${id} ${report.style} header: ` +
        `${this.#paint(this.#out, "cyan", String(added))} added, ` +
        `${this.#paint(this.#out, "cyan", String(rewritten))} rewritten.\n`,
    );
  }

  /**
   * Renders the header verify mismatch error to stderr, listing the files that
   * are missing or carry a drifted header.
   */
  headersVerifyMismatch(report: HeaderVerifyReport): void {
    const mark = this.#mark(this.#err, FIZZLE, "red");
    const heading = this.#paint(
      this.#err,
      ["bold", "red"],
      `Source files are out of sync with your saved ${report.licenseId} ${report.style} header:`,
    );
    const lines = [
      ...report.missing.map(
        (file) =>
          `  ${this.#paint(this.#err, "cyan", file)} ${this.#paint(this.#err, "yellow", "is missing the header")}`,
      ),
      ...report.drifted.map(
        (drift) =>
          `  ${this.#paint(this.#err, "cyan", drift.file)} ${this.#paint(this.#err, "yellow", this.#driftNote(drift))}`,
      ),
    ].join("\n");
    const fix = this.#paint(this.#err, "dim", `${this.#programName} --verify`);

    this.#err.write(
      `${mark}${heading}\n${lines}\n` +
        `Run ${fix} to inscribe and reconcile them.\n`,
    );
  }

  /**
   * Describes a drifted header for the mismatch listing: a header altered by
   * hand is flagged as edited, while one written for an earlier selection notes
   * what it still declares — `(declares Apache-2.0 full)` — mirroring how a
   * drifted manifest reports the license it carries.
   */
  #driftNote(drift: HeaderDrift): string {
    if (drift.reason === "edited") {
      return "header was edited by hand";
    }
    if (drift.declares !== null) {
      return `header has drifted (declares ${drift.declares.licenseId} ${drift.declares.style})`;
    }
    return "header has drifted";
  }

  /**
   * Renders a plain error message to stderr.
   */
  error(message: string): void {
    this.#err.write(`${this.#mark(this.#err, FIZZLE, "red")}${message}\n`);
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
