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

// The source file extensions a header is written into. JSON has no comment
// syntax and stylesheet/markup files are not source code, so neither is
// included; the set is the JavaScript/TypeScript family plus PHP, matching the
// manifest ecosystems the wizard already understands.
const SUPPORTED_EXTENSIONS: readonly string[] = [
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".ts",
  ".tsx",
  ".cts",
  ".mts",
  ".php",
];

// Maps each supported extension to its comment style. They all share the
// C-family block style today, but routing through a map keeps the door open for
// a language that needs its own.
const STYLE_BY_EXTENSION: Record<string, CommentStyle> = {};
for (const extension of SUPPORTED_EXTENSIONS) {
  STYLE_BY_EXTENSION[extension] = C_BLOCK;
}

/**
 * A source file as the wizard sees it: its content paired with its path. This is
 * the single boundary for working with one file — classifying a path as source
 * (the static surface) and reading or rewriting how a managed header lives in
 * the content (the instance surface). The line, preamble, and comment-block
 * mechanics are its private internals, so no caller manipulates raw lines.
 *
 * Instances are immutable: every transform returns a new SourceFile, so a header
 * is added or removed by composing values rather than mutating shared state.
 */
export class SourceFile {
  readonly #content: string;
  readonly #path: string;

  /**
   * Creates a SourceFile over the given content and path.
   *
   * @param content - The file's current text.
   * @param path - The file's path, used to pick the comment style and preamble.
   */
  constructor(content: string, path: string) {
    this.#content = content;
    this.#path = path;
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
   * The extensions the wizard writes headers into, in canonical order.
   */
  static supportedExtensions(): readonly string[] {
    return SUPPORTED_EXTENSIONS;
  }

  /**
   * Reports whether the given path is a source file the wizard writes headers
   * into, judged solely by its extension.
   *
   * @param path - The path to test.
   * @param extensions - The supported extensions; defaults to the standard set.
   */
  static isSupported(
    path: string,
    extensions: readonly string[] = SUPPORTED_EXTENSIONS,
  ): boolean {
    return extensions.includes(SourceFile.extensionOf(path));
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
   * identified by a fully-formed marker line. A hand-written notice that lacks
   * the marker — or code that merely names the marker token — is not managed.
   */
  hasManagedHeader(): boolean {
    return this.#lines().some((line) => isMarkerLine(line));
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
    return new SourceFile(
      out.length === 0 ? "" : `${out.join("\n")}\n`,
      this.#path,
    );
  }

  /**
   * Returns a copy with `block` placed as the managed header: any existing
   * managed block is replaced, the new block is inserted below the preamble, and
   * a single blank line separates it from the preamble above and the code below.
   * Hand-written comments without the marker are left in place. The result always
   * ends with a trailing newline.
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

    return new SourceFile(`${out.join("\n")}\n`, this.#path);
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
 * Splits content into lines, dropping a single trailing newline so a file with
 * or without a final newline yields the same array; empty content yields `[]`.
 */
function splitToLines(content: string): string[] {
  const trimmed = content.endsWith("\n") ? content.slice(0, -1) : content;
  return trimmed === "" ? [] : trimmed.split("\n");
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
 * The marker line locates the block; the bounds are found by walking out to the
 * enclosing comment delimiters.
 */
function findManagedBlock(lines: readonly string[]): [number, number] | null {
  const markerLine = lines.findIndex((line) => isMarkerLine(line));
  if (markerLine === -1) {
    return null;
  }

  let start = markerLine;
  while (start > 0 && !lines[start].trimStart().startsWith("/*")) {
    start -= 1;
  }

  let end = markerLine;
  while (end < lines.length - 1 && !lines[end].includes("*/")) {
    end += 1;
  }

  return [start, end];
}
