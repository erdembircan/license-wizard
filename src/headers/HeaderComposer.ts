import type { HeaderPlan } from "@headers/HeaderPlan.js";
import { HeaderRenderer } from "@headers/HeaderRenderer.js";
import {
  buildMarker,
  digestBody,
  isMarkerLine,
} from "@headers/HeaderMarker.js";
import {
  commentStyleFor,
  extensionOf,
  preambleLength,
} from "@headers/SourceFile.js";

/**
 * Composes a license header into source files: it wraps a rendered header body
 * in the right comment syntax for a file, stamps it with the wizard's marker,
 * and inserts (or replaces) it at the top of a file without disturbing the
 * preamble or any hand-written comment.
 *
 * One composer represents one selection. The body and marker are computed once
 * at construction, so the same managed block is produced for every file — which
 * makes the block deterministic, and therefore makes applying it idempotent:
 * re-applying the same selection to an already-headed file leaves it byte-for-
 * byte unchanged. Verification relies on exactly that property.
 */
export class HeaderComposer {
  readonly #body: string;
  readonly #marker: string;
  readonly #fingerprint: string;

  /**
   * Creates a new HeaderComposer for the given selection.
   *
   * @param plan - The license detail, header style, and copyright tokens.
   */
  constructor(plan: HeaderPlan) {
    this.#body = new HeaderRenderer(plan).body();
    this.#fingerprint = digestBody(this.#body);
    this.#marker = buildMarker(
      plan.detail.licenseId,
      plan.style,
      this.#fingerprint,
    );
  }

  /**
   * Returns the digest of this selection's header body — the same value stamped
   * into a freshly written marker. A managed block whose marker carries this
   * fingerprint describes the current selection's exact content; one carrying a
   * different fingerprint was written for an earlier configuration.
   */
  fingerprint(): string {
    return this.#fingerprint;
  }

  /**
   * Builds the managed comment block for a file with the given extension: the
   * rendered body and the marker line, each wrapped in that language's comment
   * syntax.
   *
   * @param extension - The file extension (e.g. `.ts`), selecting the comment style.
   */
  block(extension: string): string {
    const style = commentStyleFor(extension);
    const lines = [style.blockStart];

    for (const line of this.#body.split("\n")) {
      lines.push(
        line === "" ? style.linePrefix : `${style.linePrefix} ${line}`,
      );
    }

    lines.push(`${style.linePrefix} ${this.#marker}`);
    lines.push(style.blockEnd);

    return lines.join("\n");
  }

  /**
   * Reports whether the given file content already carries a wizard-written
   * header, identified by a fully-formed marker line. A hand-written notice that
   * lacks the marker — or source that merely names the marker token in its code —
   * is not considered managed.
   *
   * @param content - The file content to test.
   */
  hasManaged(content: string): boolean {
    return content.split("\n").some((line) => isMarkerLine(line));
  }

  /**
   * Returns the file content with this selection's header applied: any existing
   * managed block at the top is replaced, the new block is inserted below the
   * file's preamble (shebang and/or PHP open tag), and a single blank line
   * separates the block from the preamble above and the code below. Hand-written
   * comments without the marker are left in place. The result always ends with a
   * trailing newline.
   *
   * Because the block is deterministic, applying the same selection twice yields
   * identical output — the second call is a no-op — so callers can compare the
   * result against the original to detect whether anything changed.
   *
   * @param content - The current file content.
   * @param filePath - The file's path, used to pick the comment style and detect
   *   a PHP preamble.
   */
  apply(content: string, filePath: string): string {
    const extension = extensionOf(filePath);
    const { lines } = this.#split(content);

    const preamble = preambleLength(lines, extension);
    const head = lines.slice(0, preamble);
    const body = this.#dropLeadingBlanks(
      this.#stripManagedBlocks(lines.slice(preamble)),
    );

    const out: string[] = [...head];
    if (head.length > 0) {
      out.push("");
    }
    out.push(...this.block(extension).split("\n"));
    if (body.length > 0) {
      out.push("");
      out.push(...body);
    }

    return `${out.join("\n")}\n`;
  }

  /**
   * Splits content into lines, normalising the trailing newline away so a file
   * with or without a final newline produces the same line array. The header is
   * always rewritten with a single trailing newline.
   */
  #split(content: string): { lines: string[] } {
    const trimmed = content.endsWith("\n") ? content.slice(0, -1) : content;
    return { lines: trimmed === "" ? [] : trimmed.split("\n") };
  }

  /**
   * Returns the lines with any leading blank lines removed.
   */
  #dropLeadingBlanks(lines: string[]): string[] {
    let start = 0;
    while (start < lines.length && lines[start].trim() === "") {
      start += 1;
    }
    return lines.slice(start);
  }

  /**
   * Removes every wizard-managed block from the given lines, wherever it sits —
   * not only at the front. Foreign content inserted above a managed header (a
   * prepended import, a generated banner) would otherwise strand the block where
   * the front-only check can't see it, so a re-applied header lands on top as a
   * duplicate. By locating each block through its marker and excising it — along
   * with the single blank line it was inserted with — the header can be rewritten
   * cleanly at the top, and any duplicates a past run left behind collapse to
   * one. Comment blocks without the marker — hand-written notices — are left
   * untouched.
   */
  #stripManagedBlocks(lines: string[]): string[] {
    let result = lines;
    for (
      let bounds = this.#findManagedBlock(result);
      bounds !== null;
      bounds = this.#findManagedBlock(result)
    ) {
      const [start, end] = bounds;
      // Also drop the blank separator the block was written with, so removing it
      // does not leave a doubled gap behind.
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
  #findManagedBlock(lines: string[]): [number, number] | null {
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
}
