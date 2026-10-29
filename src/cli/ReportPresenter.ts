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
  VerifyNote,
} from "@cli/OutputMessage.js";
import type { TextDifference } from "@application/TextDifference.js";
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

// A line of the first-difference pair longer than DIFF_WIDTH is shown through a
// window that wide, opened DIFF_LEAD characters before the difference, so a long
// unwrapped paragraph can't flood the report.
const DIFF_WIDTH = 80;
const DIFF_LEAD = 20;

type DiffWindow = { clip: boolean; start: number; caret: number };

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
      case "version":
        return this.#version(message.version, c);
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
          message.note,
          c,
        );
      case "verifyMismatch":
        return this.#verifyMismatch(
          message.licenseId,
          message.licenseMismatch,
          message.manifests,
          message.difference,
          message.note,
          c,
        );
      case "verifyUnknownTokens":
        return this.#verifyUnknownTokens(message, c);
      case "headersNoFiles":
        return this.#headersNoFiles(message.licenseId, c);
      case "headersGenerated":
        return this.#headersGenerated(message, c);
      case "headersDryRun":
        return this.#headersDryRun(message, c);
      case "headersForceApplied":
        return this.#headersForceApplied(message, c);
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

  #version(version: string, c: boolean): string {
    const name = this.#paint(c, ["bold", "blue"], this.#programName);
    return `${name} ${version}\n`;
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
    note: VerifyNote | null,
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

    const explanation =
      note === null ? "" : `\n${this.#verifyNote(licenseId, note, c)}\n`;
    return `${mark}Realigned the project with your saved ${id} enchantment:\n${lines.join("\n")}\n${explanation}`;
  }

  #verifyMismatch(
    licenseId: string,
    licenseMismatch: boolean,
    manifests: DriftedManifest[],
    difference: TextDifference | null,
    note: VerifyNote | null,
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
      lines.push(...this.#licenseMismatchLines(difference, c));
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
    const explanation =
      note === null ? "" : `\n${this.#verifyNote(licenseId, note, c)}\n\n`;

    return (
      `${mark}${heading}\n${lines.join("\n")}\n${explanation}` +
      `Run ${fix} to reconcile, or update the configuration to match.\n`
    );
  }

  /**
   * Renders the error shown when verification stops on saved tokens that are
   * not copyright fields of the license: the tokens, the fields the license
   * accepts, the likely causes, and the config edit that fixes it.
   *
   * @param message - The unrecognized tokens, the license's fields, and the config file.
   * @param c - Whether ANSI styling is wanted.
   */
  #verifyUnknownTokens(
    message: Extract<OutputMessage, { kind: "verifyUnknownTokens" }>,
    c: boolean,
  ): string {
    const mark = this.#mark(c, FIZZLE, "red");
    const one = message.tokens.length === 1;
    const heading = this.#paint(
      c,
      ["bold", "red"],
      one
        ? `Cannot verify your saved ${message.licenseId} enchantment — this saved token is not a copyright field of ${message.licenseId}:`
        : `Cannot verify your saved ${message.licenseId} enchantment — these saved tokens are not copyright fields of ${message.licenseId}:`,
    );
    const list = message.tokens
      .map((token) => `  ${this.#paint(c, "yellow", token)}`)
      .join("\n");
    const accepts =
      message.fields.length > 0
        ? `${message.licenseId} accepts ${message.fields.map((field) => this.#paint(c, "cyan", field)).join(", ")}.`
        : `${message.licenseId} has no copyright fields.`;
    const cause = one
      ? `It may be left over from an earlier license, or SPDX may have renamed the field. ${this.#programName} can't fill it in, so nothing was checked or changed.`
      : `They may be left over from an earlier license, or SPDX may have renamed the fields. ${this.#programName} can't fill them in, so nothing was checked or changed.`;
    const config = this.#configRef(message.configFile, c);
    const fix = this.#paint(c, "dim", `${this.#programName} --verify`);
    const action =
      message.fields.length > 0
        ? `Update "tokens" in ${config}, then run ${fix} again.`
        : `Remove "tokens" from ${config}, then run ${fix} again.`;

    return `${mark}${heading}\n${list}\n${accepts} ${cause}\n${action}\n`;
  }

  /**
   * Renders the `LICENSE does not match` entry of a strict-mode report. With a
   * known first difference it names the line and column, then shows the found
   * and expected lines one above the other, with a caret under the first
   * differing character when both lines have text; without one it is the bare
   * entry.
   *
   * @param difference - Where the on-disk `LICENSE` first departs from the expected text.
   * @param c - Whether ANSI styling is wanted.
   */
  #licenseMismatchLines(
    difference: TextDifference | null,
    c: boolean,
  ): string[] {
    const entry = `  LICENSE ${this.#paint(c, "yellow", "does not match")}`;
    if (difference === null) {
      return [entry];
    }

    const { line, column, found, expected } = difference;
    const window = this.#diffWindow(difference);
    const lines = [
      `${entry} — first difference at line ${line}, column ${column}:`,
      `    ${this.#paint(c, "dim", "found:")}    ${this.#diffLine(found, window, c)}`,
      `    ${this.#paint(c, "dim", "expected:")} ${this.#diffLine(expected, window, c)}`,
    ];
    if (found && expected) {
      lines.push(
        `              ${" ".repeat(window.caret)}${this.#paint(c, "yellow", "^")}`,
      );
    }
    return lines;
  }

  /**
   * Picks the slice of the two differing lines to show. Both are shown whole
   * when they fit within DIFF_WIDTH; otherwise both are shown through the same
   * window, opened DIFF_LEAD characters before the difference, so the caret
   * lands on the same character in each. Returns whether clipping applies, the
   * window's start offset, and the caret's position within the displayed text,
   * which counts the leading ellipsis when one is shown.
   *
   * @param difference - The first difference being displayed.
   */
  #diffWindow({ column, found, expected }: TextDifference): DiffWindow {
    const longest = Math.max(found?.length ?? 0, expected?.length ?? 0);
    if (longest <= DIFF_WIDTH) {
      return { clip: false, start: 0, caret: column - 1 };
    }
    const start = Math.max(0, column - 1 - DIFF_LEAD);
    return {
      clip: true,
      start,
      caret: column - 1 - start + (start > 0 ? 1 : 0),
    };
  }

  /**
   * Renders one side of the first-difference pair: a placeholder when the line
   * is missing or blank, otherwise the line with invisible characters made
   * visible, clipped to the shared window with an ellipsis on each clipped end.
   *
   * @param text - The line to show, or null when that side has no such line.
   * @param window - The window shared by both lines.
   * @param c - Whether ANSI styling is wanted.
   */
  #diffLine(text: string | null, window: DiffWindow, c: boolean): string {
    if (text === null) {
      return this.#paint(c, "dim", "(end of file)");
    }
    if (text === "") {
      return this.#paint(c, "dim", "(blank line)");
    }

    const visible = this.#visible(text);
    if (!window.clip) {
      return visible;
    }
    const head = window.start > 0 ? "…" : "";
    const tail = visible.length > window.start + DIFF_WIDTH ? "…" : "";
    return `${head}${visible.slice(window.start, window.start + DIFF_WIDTH)}${tail}`;
  }

  /**
   * Makes the characters a terminal would hide visible, one for one so the
   * caret stays aligned: each control character, such as a carriage return or a
   * tab, becomes its Unicode control picture (`␍`, `␉`), and each trailing space
   * becomes a middle dot (`·`). Spaces just before a final carriage return count
   * as trailing, so a CRLF line's trailing spaces show as well.
   *
   * @param text - The line to make visible.
   */
  #visible(text: string): string {
    const trailing = / +(?=\r?$)/.exec(text);
    const dotsFrom = trailing === null ? text.length : trailing.index;
    const dotsTo = dotsFrom + (trailing === null ? 0 : trailing[0].length);
    let visible = "";
    for (let index = 0; index < text.length; index++) {
      const code = text.charCodeAt(index);
      if (index >= dotsFrom && index < dotsTo) {
        visible += "·";
      } else if (code < 0x20) {
        visible += String.fromCharCode(0x2400 + code);
      } else if (code === 0x7f) {
        visible += "␡";
      } else {
        visible += text[index];
      }
    }
    return visible;
  }

  /**
   * Renders the note that explains a `LICENSE` built from SPDX's matching
   * template: the saved tokens make it build from that template, which SPDX
   * revises between releases, so it can drift with no change in the project.
   * When the note offers it, it adds that removing the tokens switches to the
   * plain text.
   *
   * @param licenseId - The configured license.
   * @param note - The note to render.
   * @param c - Whether ANSI styling is wanted.
   */
  #verifyNote(licenseId: string, note: VerifyNote, c: boolean): string {
    const one = note.tokens.length === 1;
    const tokens = note.tokens
      .map((token) => this.#paint(c, "cyan", token))
      .join(", ");
    const removal = note.offerRemoval
      ? ` If you don't need ${one ? "that field" : "those fields"} filled in, remove "tokens" from ${this.#configRef(note.configFile, c)} to build from the plain text instead.`
      : "";
    return (
      `With your saved ${one ? "token" : "tokens"} (${tokens}), ${this.#programName} builds ${licenseId}'s LICENSE from SPDX's matching template rather than its plain text. ` +
      `SPDX revises that template between releases, so LICENSE can drift even when nothing in your project changed.${removal}`
    );
  }

  /**
   * Refers to the saved configuration, naming the file it was read from when
   * that is known.
   *
   * @param configFile - The file holding the saved configuration, or null.
   * @param c - Whether ANSI styling is wanted.
   */
  #configRef(configFile: string | null, c: boolean): string {
    return configFile === null
      ? "your saved config"
      : `your saved config (${this.#paint(c, "cyan", configFile)})`;
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
    return `${mark}Inscribed the ${id} ${style} header across ${written} of ${message.total} source file(s).${unchanged}${this.#skippedNote(message.skipped, c)}\n`;
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
      `${message.sample}\n\n${list}${this.#skippedNote(message.skipped, c, true)}\n`
    );
  }

  #headersForceApplied(
    message: Extract<OutputMessage, { kind: "headersForceApplied" }>,
    c: boolean,
  ): string {
    const id = this.#paint(c, "bold", message.licenseId);
    const style = this.#paint(c, "cyan", message.style);
    const file = this.#paint(c, "cyan", message.file);

    if (message.dryRun) {
      const mark = this.#mark(c, GLIMMER, "yellow");
      const heading = this.#paint(
        c,
        ["bold", "yellow"],
        "Dry run — no source file was touched.",
      );
      return message.outcome === "written"
        ? `${mark}${heading} Would force the ${id} ${style} header into ${file}.\n`
        : `${mark}${heading} ${file} already bears the ${id} ${style} header.\n`;
    }

    const mark = this.#mark(c, SPARK, "green");
    return message.outcome === "written"
      ? `${mark}Forced the ${id} ${style} header into ${file}.\n`
      : `${mark}${file} already bears the ${id} ${style} header; nothing to change.\n`;
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
    skipped: string[],
    c: boolean,
  ): string {
    const mark = this.#mark(c, SPARK, "green");
    const id = this.#paint(c, "bold", licenseId);
    // The success claim covers only the files that can carry the header; skipped
    // files (foreign notice, unplaceable PHP) are reported separately and must
    // not be counted among those that "bear" it.
    const bearing = total - skipped.length;
    return `${mark}All ${bearing} source file(s) bear the expected ${id} ${style} header.${this.#skippedNote(skipped, c)}\n`;
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
      `${this.#skippedNote(message.skipped, c)}\n`
    );
  }

  /**
   * Renders the trailing note listing the files a header could not be safely
   * written into, followed by a copy-pasteable `--force-header` example so a
   * caller (especially an agent reading non-interactive output) can override the
   * guard for a path it knows is safe. Returns the empty string when none were
   * skipped. `future` words it for a dry run ("Would skip …").
   *
   * @param skipped - The skipped file paths.
   * @param color - Whether ANSI styling is wanted.
   * @param future - Word it as a dry-run prediction rather than a past result.
   */
  #skippedNote(skipped: string[], color: boolean, future = false): string {
    if (skipped.length === 0) {
      return "";
    }

    const lead = future
      ? `Would skip ${skipped.length} file(s) the header can't be safely written into:`
      : `Skipped ${skipped.length} file(s) the header couldn't be safely written into:`;
    const list = skipped
      .map((file) => `  ${this.#paint(color, "cyan", file)}`)
      .join("\n");
    const example = this.#paint(
      color,
      "dim",
      `${this.#programName} --force-header "${skipped[0]}"`,
    );

    return (
      `\n\n${lead}\n${list}\n\n` +
      `If one is safe to head, force it in (non-interactive):\n  ${example}`
    );
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
