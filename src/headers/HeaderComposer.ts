import type { HeaderPlan } from "@headers/HeaderPlan.js";
import { HeaderRenderer } from "@headers/HeaderRenderer.js";
import {
  buildMarker,
  digestBody,
  isMarkerLine,
} from "@headers/HeaderMarker.js";
import {
  dropLeadingBlanks,
  splitToLines,
  stripManagedBlocks,
} from "@headers/ManagedBlock.js";
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
    const lines = splitToLines(content);

    const preamble = preambleLength(lines, extension);
    const head = lines.slice(0, preamble);
    const body = dropLeadingBlanks(stripManagedBlocks(lines.slice(preamble)));

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
}
