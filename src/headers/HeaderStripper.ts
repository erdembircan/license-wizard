import { isMarkerLine } from "@headers/HeaderMarker.js";
import {
  dropLeadingBlanks,
  splitToLines,
  stripManagedBlocks,
} from "@headers/ManagedBlock.js";
import { extensionOf, preambleLength } from "@headers/SourceFile.js";

export type StripResult = {
  /** The file content with every managed header removed. */
  content: string;
  /** Whether a managed header was present and removed. */
  removed: boolean;
};

/**
 * Removes wizard-managed license headers from a file's content — the inverse of
 * {@link HeaderComposer}. Unlike composing, stripping needs no license, style,
 * or copyright: a managed block is identified solely by its marker, so the same
 * stripper clears a header of any license or style.
 *
 * A file that carries no managed header is returned untouched (and reported as
 * `removed: false`), so a removal pass never rewrites files it has nothing to do
 * to. The preamble — a shebang or PHP open tag — is preserved; only the managed
 * block and the blank line it was written with are taken out.
 */
export class HeaderStripper {
  /**
   * Returns the content with every managed header removed, and whether one was
   * present. Content without a managed marker line is returned exactly as given.
   *
   * @param content - The current file content.
   * @param filePath - The file's path, used to detect a PHP preamble.
   */
  strip(content: string, filePath: string): StripResult {
    const lines = splitToLines(content);
    if (!lines.some((line) => isMarkerLine(line))) {
      return { content, removed: false };
    }

    const preamble = preambleLength(lines, extensionOf(filePath));
    const head = lines.slice(0, preamble);
    const body = dropLeadingBlanks(stripManagedBlocks(lines.slice(preamble)));

    const out = [...head, ...body];
    return {
      content: out.length === 0 ? "" : `${out.join("\n")}\n`,
      removed: true,
    };
  }
}
