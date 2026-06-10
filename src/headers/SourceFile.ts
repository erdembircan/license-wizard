/*
 * SPDX-License-Identifier: Apache-2.0
 * SPDX-FileCopyrightText: 2026 Erdem Bircan
 * license-wizard managed-header v1 Apache-2.0 short 74d1a0534fa2
 */

import { isMarkerLine } from "@headers/HeaderMarker.js";

export type CommentStyle = {
  blockStart: string;
  linePrefix: string;
  blockEnd: string;
};

// Every ecosystem this tool supports (the npm and Composer worlds) writes its
// source in C-family syntax, so a single block-comment style covers them all.
const C_BLOCK: CommentStyle = {
  blockStart: "/*",
  linePrefix: " *",
  blockEnd: " */",
};

// Per-language comment styles. Empty today — every language the wizard supports
// uses the C-family block style (the fallback below) — but routing a lookup
// through a map keeps the door open for a language that needs its own.
const STYLE_BY_EXTENSION: Record<string, CommentStyle> = {};

/**
 * A source file as the wizard sees it: its content paired with its path, and the
 * boundary for reading or rewriting how a managed header lives in that content.
 * The line, preamble, and comment-block mechanics are its private internals, so
 * no caller manipulates raw lines.
 *
 * Instances are immutable: every transform returns a new SourceFile, so a header
 * is added or removed by composing values rather than mutating shared state.
 */
export class SourceFile {
  readonly #content: string;
  readonly #path: string;
  readonly #eol: string;

  /**
   * Creates a SourceFile over the given content and path.
   *
   * @param content - The file's current text.
   * @param path - The file's path, used to pick the comment style and preamble.
   */
  constructor(content: string, path: string) {
    this.#content = content;
    this.#path = path;
    // Capture the file's own line ending so adding or removing a header keeps it:
    // a CRLF file stays CRLF rather than gaining LF-only header lines. (A final
    // newline is always written, normalising a missing one — a deliberate, lint-
    // friendly convention rather than a byte-for-byte round trip.)
    this.#eol = content.includes("\r\n") ? "\r\n" : "\n";
  }

  /**
   * Returns the lowercased extension of a path including its leading dot (e.g.
   * `.ts`), or the empty string when the path has no extension.
   *
   * @param path - The path to inspect.
   */
  static extensionOf(path: string): string {
    const base = path.slice(path.lastIndexOf("/") + 1);
    const dot = base.lastIndexOf(".");
    return dot <= 0 ? "" : base.slice(dot).toLowerCase();
  }

  /**
   * Returns the comment style used to embed a header in files of the given
   * extension. Every supported extension shares the C-family block style.
   *
   * @param extension - The file extension (e.g. `.ts`).
   */
  static commentStyleFor(extension: string): CommentStyle {
    return STYLE_BY_EXTENSION[extension] ?? C_BLOCK;
  }

  /**
   * The file's current content.
   */
  toString(): string {
    return this.#content;
  }

  /**
   * Reports whether the file currently carries a wizard-managed header,
   * identified by a marker line sitting inside a well-formed comment block. A
   * hand-written notice that lacks the marker — or code that merely names the
   * marker token, including a marker-shaped line loose in a template literal or
   * doc text — is not managed: detection requires the same enclosing block
   * comment the wizard writes, never a bare marker-shaped line.
   */
  hasManagedHeader(): boolean {
    return findManagedBlock(this.#lines()) !== null;
  }

  /**
   * Reports whether the file already declares a license that the wizard did not
   * write — an `SPDX-License-Identifier` tag sitting outside any of its own
   * managed blocks. Prepending a header to such a file would leave it with two
   * contradictory license declarations, so callers skip it instead. The wizard's
   * own managed blocks are excluded before the test, so a file it previously
   * headed (or is re-heading with a different license) is never mistaken for a
   * foreign notice.
   */
  hasForeignLicenseNotice(): boolean {
    const { head, body } = this.#split();
    return [...head, ...body].some((line) =>
      /SPDX-License-Identifier\s*:/i.test(line),
    );
  }

  /**
   * Reports whether a managed header can be safely placed at the top of this
   * file. True for everything except a PHP file whose first meaningful content
   * is not a `<?php` open tag — a legacy HTML-first template — where the comment
   * block would land outside any PHP tag and be served verbatim to visitors as
   * page output. Such files are skipped rather than corrupted. An empty or
   * blank-only PHP file has nothing to leak and is placeable.
   */
  canPlaceHeader(): boolean {
    if (SourceFile.extensionOf(this.#path) !== ".php") {
      return true;
    }
    const lines = this.#lines();
    let index = lines[0]?.startsWith("#!") ? 1 : 0;
    while (index < lines.length && lines[index].trim() === "") {
      index += 1;
    }
    return (
      index >= lines.length || lines[index].trimStart().startsWith("<?php")
    );
  }

  /**
   * Returns a copy with every managed header removed, wherever it sits, along
   * with the blank line it was written with. The preamble (a shebang or PHP open
   * tag) is preserved; a file with no managed header is returned unchanged.
   */
  withoutManagedHeaders(): SourceFile {
    if (!this.hasManagedHeader()) {
      return this;
    }
    const { head, body } = this.#split();
    const out = [...head, ...body];
    return new SourceFile(this.#assemble(out), this.#path);
  }

  /**
   * Returns a copy with `block` placed as the managed header: any existing
   * managed block is replaced, the new block is inserted below the preamble, and
   * a single blank line separates it from the preamble above and the code below.
   * Hand-written comments without the marker are left in place. The file's line
   * ending is preserved and the result always ends with a trailing newline.
   *
   * @param block - The fully comment-wrapped managed block to place.
   */
  withManagedHeader(block: string): SourceFile {
    const { head, body } = this.#split();

    const out: string[] = [...head];
    if (head.length > 0) {
      out.push("");
    }
    out.push(...block.split("\n"));
    if (body.length > 0) {
      out.push("");
      out.push(...body);
    }

    return new SourceFile(this.#assemble(out), this.#path);
  }

  /**
   * Joins reconstructed lines back into file content using the file's own line
   * ending, so a CRLF file stays CRLF, terminating with a trailing newline.
   * Empty input yields the empty string.
   */
  #assemble(lines: readonly string[]): string {
    return lines.length === 0 ? "" : lines.join(this.#eol) + this.#eol;
  }

  /**
   * Splits the content into its preamble (`head`) and its header-free remainder
   * (`body`) — the shared first step of adding or removing a header. The body has
   * every managed block stripped and any leading blank lines dropped.
   */
  #split(): { head: string[]; body: string[] } {
    const lines = this.#lines();
    const preamble = preambleLength(lines, SourceFile.extensionOf(this.#path));
    return {
      head: lines.slice(0, preamble),
      body: dropLeadingBlanks(stripManagedBlocks(lines.slice(preamble))),
    };
  }

  /**
   * The content as lines, with a single trailing newline normalised away.
   */
  #lines(): string[] {
    return splitToLines(this.#content);
  }
}

/**
 * Counts the leading preamble that must stay above any header — a `#!` shebang,
 * and for PHP the opening `<?php` tag line. Placing the header after these keeps
 * shebangs executable and the comment inside PHP's tags rather than emitted as
 * page output.
 */
function preambleLength(lines: readonly string[], extension: string): number {
  let index = 0;

  if (lines[index]?.startsWith("#!")) {
    index += 1;
  }

  if (extension === ".php") {
    for (let scan = index; scan < lines.length; scan += 1) {
      if (lines[scan].trim() === "") {
        continue;
      }
      if (lines[scan].trimStart().startsWith("<?php")) {
        return scan + 1;
      }
      // First meaningful line is not an open tag; do not claim a PHP preamble.
      break;
    }
  }

  return index;
}

/**
 * Splits content into lines, dropping a single trailing newline (LF or CRLF) so
 * a file with or without a final newline yields the same array, and stripping a
 * carriage return from each line so CRLF and LF files produce identical lines to
 * reason over. Empty content yields `[]`.
 */
function splitToLines(content: string): string[] {
  const trimmed = content.endsWith("\r\n")
    ? content.slice(0, -2)
    : content.endsWith("\n")
      ? content.slice(0, -1)
      : content;
  return trimmed === "" ? [] : trimmed.split(/\r?\n/);
}

/**
 * Returns the lines with any leading blank lines removed.
 */
function dropLeadingBlanks(lines: readonly string[]): string[] {
  let start = 0;
  while (start < lines.length && lines[start].trim() === "") {
    start += 1;
  }
  return lines.slice(start);
}

/**
 * Removes every wizard-managed block from the given lines, wherever it sits —
 * not only at the front. Foreign content inserted above a managed header would
 * otherwise strand the block where a front-only check can't see it, so a
 * re-applied header lands on top as a duplicate. Locating each block through its
 * marker and excising it — with the blank line it was written with — lets the
 * header be rewritten cleanly at the top, and collapses any duplicates a past
 * run left behind. Comment blocks without the marker are left untouched.
 */
function stripManagedBlocks(lines: readonly string[]): string[] {
  let result = [...lines];
  for (
    let bounds = findManagedBlock(result);
    bounds !== null;
    bounds = findManagedBlock(result)
  ) {
    const [start, end] = bounds;
    const after =
      end + 1 < result.length && result[end + 1].trim() === ""
        ? end + 2
        : end + 1;
    result = [...result.slice(0, start), ...result.slice(after)];
  }
  return result;
}

/**
 * Returns the inclusive `[start, end]` line range of the first wizard-managed
 * block — the block comment carrying the marker — or null when none is present.
 * The marker line locates a candidate; the bounds are confirmed by walking out
 * to the enclosing comment delimiters. A marker-shaped line that is *not* sealed
 * in a well-formed comment (one stranded in a template literal or doc text, or a
 * genuine block whose `/*` or closing delimiter was lost in an edit) is not a
 * managed block: the walk returns null for it and the search moves on to the
 * next candidate. This is the load-bearing safety property — the fail-safe
 * response to an unrecognised block is to skip it, never to guess a span and
 * delete everything inside it.
 */
function findManagedBlock(lines: readonly string[]): [number, number] | null {
  for (let marker = 0; marker < lines.length; marker += 1) {
    if (!isMarkerLine(lines[marker])) {
      continue;
    }
    const bounds = enclosingComment(lines, marker);
    if (bounds !== null) {
      return bounds;
    }
  }
  return null;
}

/**
 * Confirms that the marker line at `markerLine` sits inside a well-formed block
 * comment and returns its inclusive `[start, end]` bounds, or null when it does
 * not. The walk climbs to a `/*` opener and descends to a closing `*` + `/`
 * delimiter, but only across comment-body lines (those whose trimmed form begins
 * with `*`); the moment it would step onto a line that is neither a body line
 * nor the delimiter it seeks — or run off either end of the file — the marker is
 * not enclosed and the block is rejected.
 */
function enclosingComment(
  lines: readonly string[],
  markerLine: number,
): [number, number] | null {
  let start = markerLine;
  while (!lines[start].trimStart().startsWith("/*")) {
    if (start === 0 || !lines[start].trimStart().startsWith("*")) {
      return null;
    }
    start -= 1;
  }

  let end = markerLine;
  while (!lines[end].includes("*/")) {
    if (end === lines.length - 1 || !lines[end].trimStart().startsWith("*")) {
      return null;
    }
    end += 1;
  }

  return [start, end];
}
