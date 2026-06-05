import type { HeaderPlan } from "@headers/HeaderPlan.js";
import { HeaderRenderer } from "@headers/HeaderRenderer.js";
import { buildMarker, digestBody, hasMarker } from "@headers/HeaderMarker.js";
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
   * header, identified by its marker. A hand-written notice that lacks the
   * marker is not considered managed.
   *
   * @param content - The file content to test.
   */
  hasManaged(content: string): boolean {
    return hasMarker(content);
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
      this.#stripManagedBlock(this.#dropLeadingBlanks(lines.slice(preamble))),
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
   * Removes a wizard-managed block from the front of the given lines when one is
   * present, returning the lines that follow it. A leading comment block that
   * does not carry the marker — a hand-written notice — is left untouched, as is
   * anything that is not a block comment.
   */
  #stripManagedBlock(lines: string[]): string[] {
    if (lines.length === 0 || !lines[0].trimStart().startsWith("/*")) {
      return lines;
    }

    let end = -1;
    for (let index = 0; index < lines.length; index += 1) {
      if (lines[index].includes("*/")) {
        end = index;
        break;
      }
    }

    if (end === -1 || !hasMarker(lines.slice(0, end + 1).join("\n"))) {
      return lines;
    }

    return lines.slice(end + 1);
  }
}
