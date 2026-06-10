/*
 * SPDX-License-Identifier: Apache-2.0
 * SPDX-FileCopyrightText: 2026 Erdem Bircan
 * license-wizard managed-header v1 Apache-2.0 short 74d1a0534fa2
 */

import { styleText } from "node:util";
import type {
  DriftedManifest,
  HeaderDriftNote,
  OutputMessage,
  ReconciledManifest,
} from "@cli/OutputMessage.js";
import type { TemplateSlot } from "@licensing/TemplateSlot.js";

type Style = Parameters<typeof styleText>[0];

// styleText sniffs the stream by default; the sink decides whether color is
// wanted and passes it in, so the codes are always emitted once we get here.
const FORCE = { validateStream: false } as const;

// The wizard signs its output with a spark instead of a plain checkbox: a bright
// spark when a spell lands, a faint glimmer when one is only rehearsed (dry run),
// and a fizzle when an incantation fails.
const SPARK = "✦";
const GLIMMER = "✧";
const FIZZLE = "✗";

/**
 * Turns the reporter's view-model messages into terminal text. This is the sole
 * home of the wizard's wording and coloring: every metaphor, glyph, and ANSI
 * code lives here, so the phrasing can be reworked freely without touching the
 * semantic `OutputMessage` surface that the rest of the app and its tests depend
 * on. Coloring is decided by the sink and passed in per render.
 */
export class ReportPresenter {
  readonly #programName: string;

  /**
   * Creates a new ReportPresenter.
   *
   * @param programName - The program name shown in usage, examples, and hints.
   */
  constructor(programName: string) {
    this.#programName = programName;
  }

  /**
   * Renders a single message to the exact string that should be written to its
   * stream, including the trailing newline. When `color` is false the text is
   * returned plain, with no ANSI codes.
   *
   * @param message - The view-model message to render.
   * @param options - Rendering options; `color` enables ANSI styling.
   */
  present(message: OutputMessage, options: { color: boolean }): string {
    const c = options.color;
    switch (message.kind) {
      case "usage":
        return this.#usage(message.options, c);
      case "tokens":
        return this.#tokens(message.licenseId, message.slots, c);
      case "generated":
        return this.#generated(message.licenseId, message.savedTo, c);
      case "dryRun":
        return this.#dryRun(message, c);
      case "missingFields":
        return this.#missingFields(message.licenseId, message.missing, c);
      case "unknownFields":
        return this.#unknownFields(
          message.licenseId,
          message.unknown,
          message.slots,
          c,
        );
      case "licenseNotFound":
        return this.#licenseNotFound(message.licenseId, message.suggestions, c);
      case "verifyMatch":
        return this.#verifyMatch(
          message.licenseId,
          message.manifestsChecked,
          c,
        );
      case "verifyFixed":
        return this.#verifyFixed(
          message.licenseId,
          message.licenseRegenerated,
          message.manifests,
          c,
        );
      case "verifyMismatch":
        return this.#verifyMismatch(
          message.licenseId,
          message.licenseMismatch,
          message.manifests,
          c,
        );
      case "headersNoFiles":
        return this.#headersNoFiles(message.licenseId, c);
      case "headersGenerated":
        return this.#headersGenerated(message, c);
      case "headersDryRun":
        return this.#headersDryRun(message, c);
      case "headersRemoved":
        return this.#headersRemoved(message.removed, message.total, c);
      case "headersRemoveDryRun":
        return this.#headersRemoveDryRun(message.removed, message.total, c);
      case "headersVerifyMatch":
        return this.#headersVerifyMatch(
          message.licenseId,
          message.style,
          message.total,
          message.skipped,
          c,
        );
      case "headersVerifyFixed":
        return this.#headersVerifyFixed(message, c);
      case "headersVerifyMismatch":
        return this.#headersVerifyMismatch(message, c);
      case "error":
        return this.#error(message.message, c);
    }
  }

  #usage(options: string, c: boolean): string {
    const header = this.#paint(c, "bold", "Usage:");
    const name = this.#paint(c, ["bold", "blue"], this.#programName);
    const label = this.#paint(c, "bold", "Options:");
    return `${header} ${name} [options]\n\n${label}\n${options}\n`;
  }

  #tokens(licenseId: string, slots: TemplateSlot[], c: boolean): string {
    const id = this.#paint(c, "bold", licenseId);

    if (slots.length === 0) {
      return `${id} has no customizable copyright fields; it is generated as official text unchanged.\n`;
    }

    const list = slots
      .map((slot) => `  ${this.#paint(c, "cyan", slot.label)}`)
      .join("\n");
    const example = this.#paint(
      c,
      "dim",
      `${this.#programName} --license ${licenseId} ${this.#setExample(slots)}`,
    );

    return (
      `${id} accepts the following copyright field(s):\n\n${list}\n\n` +
      `Generate a customized license by supplying every field, e.g.:\n\n` +
      `  ${example}\n\n` +
      `Omit --set to write the official text unchanged.\n`
    );
  }

  #generated(licenseId: string, savedTo: string, c: boolean): string {
    const mark = this.#mark(c, SPARK, "green");
    const id = this.#paint(c, "bold", licenseId);
    const savedNote =
      savedTo === ""
        ? ""
        : ` Spellbook saved to ${this.#paint(c, "cyan", savedTo)}.`;
    return `${mark}Conjured your LICENSE (${id}) and inscribed it across the project manifests.${savedNote}\n`;
  }

  #dryRun(
    message: Extract<OutputMessage, { kind: "dryRun" }>,
    c: boolean,
  ): string {
    const mark = this.#mark(c, GLIMMER, "yellow");
    const heading = this.#paint(
      c,
      ["bold", "yellow"],
      "Dry run — the spell was only rehearsed; no files were written.",
    );
    const id = this.#paint(c, "bold", message.licenseId);
    const plan = this.#dryRunPlan(message, c);

    return (
      `${mark}${heading}\n\n` +
      `Would conjure LICENSE (${id}):\n\n${message.content}\n\n` +
      `${plan}\n`
    );
  }

  #dryRunPlan(
    message: Extract<OutputMessage, { kind: "dryRun" }>,
    c: boolean,
  ): string {
    const lines: string[] = [];

    const manifests =
      message.manifests.length > 0
        ? message.manifests
            .map((name) => this.#paint(c, "cyan", name))
            .join(", ")
        : "none present";
    lines.push(`  Inscribe ${message.licenseId} in manifests: ${manifests}`);

    if (message.save.action === "save") {
      lines.push(
        `  Save your spellbook to ${this.#paint(c, "cyan", message.save.target)}`,
      );
    } else if (message.save.action === "clear") {
      lines.push("  Banish the spellbook from every location");
    }

    const label = this.#paint(c, "dim", "The spell would also:");
    return `${label}\n${lines.join("\n")}`;
  }

  #missingFields(
    licenseId: string,
    missing: TemplateSlot[],
    c: boolean,
  ): string {
    const heading = this.#paint(
      c,
      ["bold", "red"],
      `Cannot conjure a customized ${licenseId} license — missing required field(s):`,
    );
    const list = missing
      .map((slot) => `  ${this.#paint(c, "yellow", slot.label)}`)
      .join("\n");
    const example = this.#paint(c, "dim", this.#setExample(missing));

    return (
      `${this.#mark(c, FIZZLE, "red")}${heading}\n\n${list}\n\n` +
      `Supply every field (e.g. ${example}), or run with --get-tokens to list them all.\n`
    );
  }

  #unknownFields(
    licenseId: string,
    unknown: string[],
    slots: TemplateSlot[],
    c: boolean,
  ): string {
    const heading = this.#paint(
      c,
      ["bold", "red"],
      `Unknown copyright field(s) for ${licenseId}:`,
    );
    const unknownList = unknown
      .map((field) => this.#paint(c, "yellow", field))
      .join(", ");
    const mark = this.#mark(c, FIZZLE, "red");

    if (slots.length === 0) {
      // The surface being generated (the license text) has no fields, but the
      // license may still carry header-only ones, which `--get-tokens` lists —
      // so don't claim it has none outright and contradict that listing.
      return (
        `${mark}${heading} ${unknownList}.\n` +
        `${licenseId}'s license text has no customizable copyright fields. ` +
        `Run with --get-tokens to see every field, including any used only by a --headers full notice.\n`
      );
    }

    const accepted = `${licenseId} accepts: ${slots
      .map((slot) => this.#paint(c, "cyan", slot.label))
      .join(", ")}.`;
    return (
      `${mark}${heading} ${unknownList}.\n` +
      `${accepted}\nRun with --get-tokens to list them.\n`
    );
  }

  #licenseNotFound(
    licenseId: string,
    suggestions: { licenseId: string; name: string }[],
    c: boolean,
  ): string {
    const heading = this.#paint(
      c,
      ["bold", "red"],
      `No license matches "${licenseId}".`,
    );
    const mark = this.#mark(c, FIZZLE, "red");

    if (suggestions.length === 0) {
      return (
        `${mark}${heading}\n` +
        `Run ${this.#programName} with no flags to search the full list interactively.\n`
      );
    }

    const width = Math.max(...suggestions.map((s) => s.licenseId.length));
    const list = suggestions
      .map((entry) => {
        const id = this.#paint(c, "cyan", entry.licenseId.padEnd(width));
        const name = this.#paint(c, "dim", entry.name);
        return `  ${id}  ${name}`;
      })
      .join("\n");
    const example = this.#paint(
      c,
      "dim",
      `${this.#programName} --license ${suggestions[0].licenseId}`,
    );

    return (
      `${mark}${heading} Did you mean one of these?\n\n${list}\n\n` +
      `Re-run with the exact identifier, e.g.:\n\n  ${example}\n`
    );
  }

  #verifyMatch(
    licenseId: string,
    manifestsChecked: boolean,
    c: boolean,
  ): string {
    const mark = this.#mark(c, SPARK, "green");
    const id = this.#paint(c, "bold", licenseId);
    const surfaces = manifestsChecked
      ? "LICENSE and project manifests are"
      : "LICENSE is";
    return `${mark}${surfaces} up to date, in harmony with your saved ${id} enchantment.\n`;
  }

  #verifyFixed(
    licenseId: string,
    licenseRegenerated: boolean,
    manifests: ReconciledManifest[],
    c: boolean,
  ): string {
    const mark = this.#mark(c, SPARK, "green");
    const id = this.#paint(c, "bold", licenseId);
    const lines: string[] = [];

    if (licenseRegenerated) {
      lines.push(`  LICENSE ${this.#paint(c, "yellow", "regenerated")}`);
    }
    for (const manifest of manifests) {
      const name = this.#paint(c, "cyan", manifest.name);
      const was = manifest.was === null ? "" : ` (was ${manifest.was})`;
      lines.push(`  ${name} license updated to ${licenseId}${was}`);
    }

    return `${mark}Realigned the project with your saved ${id} enchantment:\n${lines.join("\n")}\n`;
  }

  #verifyMismatch(
    licenseId: string,
    licenseMismatch: boolean,
    manifests: DriftedManifest[],
    c: boolean,
  ): string {
    const mark = this.#mark(c, FIZZLE, "red");
    const heading = this.#paint(
      c,
      ["bold", "red"],
      `Project is out of sync with your saved ${licenseId} enchantment:`,
    );
    const lines: string[] = [];

    if (licenseMismatch) {
      lines.push(`  LICENSE ${this.#paint(c, "yellow", "does not match")}`);
    }
    for (const manifest of manifests) {
      const name = this.#paint(c, "cyan", manifest.name);
      const declared =
        manifest.declared === null ? "no license" : manifest.declared;
      lines.push(
        `  ${name} license declares ${declared} (expected ${licenseId})`,
      );
    }

    const fix = this.#paint(c, "dim", `${this.#programName} --verify`);
    return (
      `${mark}${heading}\n${lines.join("\n")}\n` +
      `Run ${fix} to reconcile, or update the configuration to match.\n`
    );
  }

  #headersNoFiles(licenseId: string, c: boolean): string {
    const id = this.#paint(c, "bold", licenseId);
    return `No source files to inscribe with the ${id} header — the scan found nothing eligible.\n`;
  }

  #headersGenerated(
    message: Extract<OutputMessage, { kind: "headersGenerated" }>,
    c: boolean,
  ): string {
    const mark = this.#mark(c, SPARK, "green");
    const id = this.#paint(c, "bold", message.licenseId);
    const style = this.#paint(c, "cyan", message.style);
    const written = this.#paint(c, "bold", String(message.written));
    const unchanged =
      message.unchanged > 0
        ? ` ${message.unchanged} already bore the mark.`
        : "";
    return `${mark}Inscribed the ${id} ${style} header across ${written} of ${message.total} source file(s).${unchanged}${this.#skippedNote(message.skipped)}\n`;
  }

  #headersDryRun(
    message: Extract<OutputMessage, { kind: "headersDryRun" }>,
    c: boolean,
  ): string {
    const mark = this.#mark(c, GLIMMER, "yellow");
    const heading = this.#paint(
      c,
      ["bold", "yellow"],
      "Dry run — no source file was touched.",
    );
    const id = this.#paint(c, "bold", message.licenseId);
    const style = this.#paint(c, "cyan", message.style);
    const list = message.files
      .map((file) => `  ${this.#paint(c, "cyan", file)}`)
      .join("\n");

    return (
      `${mark}${heading}\n\n` +
      `Would inscribe the ${id} ${style} header into ${message.files.length} file(s):\n\n` +
      `${message.sample}\n\n${list}\n`
    );
  }

  #headersRemoved(removed: string[], total: number, c: boolean): string {
    if (removed.length === 0) {
      const mark = this.#mark(c, GLIMMER, "yellow");
      return `${mark}No wizard-written headers found across ${total} source file(s).\n`;
    }

    const mark = this.#mark(c, SPARK, "green");
    const count = this.#paint(c, "bold", String(removed.length));
    return `${mark}Stripped the license header from ${count} source file(s).\n`;
  }

  #headersRemoveDryRun(removed: string[], total: number, c: boolean): string {
    const mark = this.#mark(c, GLIMMER, "yellow");
    const heading = this.#paint(
      c,
      ["bold", "yellow"],
      "Dry run — no source file was touched.",
    );

    if (removed.length === 0) {
      return (
        `${mark}${heading}\n\n` +
        `No wizard-written headers found across ${total} source file(s).\n`
      );
    }

    const list = removed
      .map((file) => `  ${this.#paint(c, "cyan", file)}`)
      .join("\n");
    return (
      `${mark}${heading}\n\n` +
      `Would strip the license header from ${removed.length} source file(s):\n\n` +
      `${list}\n`
    );
  }

  #headersVerifyMatch(
    licenseId: string,
    style: string,
    total: number,
    skipped: number,
    c: boolean,
  ): string {
    const mark = this.#mark(c, SPARK, "green");
    const id = this.#paint(c, "bold", licenseId);
    // The success claim covers only the files that can carry the header; skipped
    // files (foreign notice, unplaceable PHP) are reported separately and must
    // not be counted among those that "bear" it.
    const bearing = total - skipped;
    return `${mark}All ${bearing} source file(s) bear the expected ${id} ${style} header.${this.#skippedNote(skipped)}\n`;
  }

  #headersVerifyFixed(
    message: Extract<OutputMessage, { kind: "headersVerifyFixed" }>,
    c: boolean,
  ): string {
    const mark = this.#mark(c, SPARK, "green");
    const id = this.#paint(c, "bold", message.licenseId);
    return (
      `${mark}Realigned the ${id} ${message.style} header: ` +
      `${this.#paint(c, "cyan", String(message.added))} added, ` +
      `${this.#paint(c, "cyan", String(message.rewritten))} rewritten.` +
      `${this.#skippedNote(message.skipped)}\n`
    );
  }

  /**
   * Renders the trailing note about files a header could not be safely written
   * into, or the empty string when none were skipped.
   */
  #skippedNote(skipped: number): string {
    return skipped > 0
      ? ` Skipped ${skipped} file(s) the header couldn't be safely written into.`
      : "";
  }

  #headersVerifyMismatch(
    message: Extract<OutputMessage, { kind: "headersVerifyMismatch" }>,
    c: boolean,
  ): string {
    const mark = this.#mark(c, FIZZLE, "red");
    const heading = this.#paint(
      c,
      ["bold", "red"],
      `Source files are out of sync with your saved ${message.licenseId} ${message.style} header:`,
    );
    const lines = [
      ...message.missing.map(
        (file) =>
          `  ${this.#paint(c, "cyan", file)} ${this.#paint(c, "yellow", "is missing the header")}`,
      ),
      ...message.drifted.map(
        (drift) =>
          `  ${this.#paint(c, "cyan", drift.file)} ${this.#paint(c, "yellow", this.#driftNote(drift))}`,
      ),
    ].join("\n");
    const fix = this.#paint(c, "dim", `${this.#programName} --verify`);

    return (
      `${mark}${heading}\n${lines}\n` +
      `Run ${fix} to inscribe and reconcile them.\n`
    );
  }

  #error(message: string, c: boolean): string {
    return `${this.#mark(c, FIZZLE, "red")}${message}\n`;
  }

  /**
   * Describes a drifted header for the mismatch listing: a hand-edit, an earlier
   * selection the block still declares, or an unparseable drift.
   *
   * @param drift - The reduced drift note for a single source file.
   */
  #driftNote(drift: HeaderDriftNote): string {
    if (drift.kind === "edited") {
      return "header was edited by hand";
    }
    if (drift.kind === "declares") {
      return `header has drifted (declares ${drift.licenseId} ${drift.style})`;
    }
    return "header has drifted";
  }

  /**
   * Builds a `--set "label=<value>"` example spanning the given slots.
   *
   * @param slots - The slots to include in the example.
   */
  #setExample(slots: TemplateSlot[]): string {
    return slots.map((slot) => `--set "${slot.label}=<value>"`).join(" ");
  }

  /**
   * Styles the given text when color is enabled, otherwise returns it unchanged.
   *
   * @param color - Whether ANSI styling is wanted.
   * @param styles - The style or styles to apply.
   * @param text - The text to style.
   */
  #paint(color: boolean, styles: Style, text: string): string {
    return color ? styleText(styles, text, FORCE) : text;
  }

  /**
   * Returns the colored status glyph followed by a space when color is enabled,
   * or an empty string otherwise so plain output stays undecorated.
   *
   * @param color - Whether ANSI styling is wanted.
   * @param glyph - The status glyph to show.
   * @param style - The color to paint the glyph.
   */
  #mark(color: boolean, glyph: string, style: Style): string {
    return color ? `${styleText(style, glyph, FORCE)} ` : "";
  }
}
