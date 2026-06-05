import { isMarkerLine } from "@headers/HeaderMarker.js";

/**
 * Splits content into lines, normalising away a single trailing newline so a
 * file with or without a final newline produces the same line array. Returns an
 * empty array for empty content.
 *
 * @param content - The file content to split.
 */
export function splitToLines(content: string): string[] {
  const trimmed = content.endsWith("\n") ? content.slice(0, -1) : content;
  return trimmed === "" ? [] : trimmed.split("\n");
}

/**
 * Returns the lines with any leading blank lines removed.
 *
 * @param lines - The lines to trim.
 */
export function dropLeadingBlanks(lines: readonly string[]): string[] {
  let start = 0;
  while (start < lines.length && lines[start].trim() === "") {
    start += 1;
  }
  return lines.slice(start);
}

/**
 * Removes every wizard-managed block from the given lines, wherever it sits —
 * not only at the front. Foreign content inserted above a managed header (a
 * prepended import, a generated banner) would otherwise strand the block where a
 * front-only check can't see it, so a re-applied header lands on top as a
 * duplicate. By locating each block through its marker and excising it — along
 * with the single blank line it was inserted with — the header can be rewritten
 * cleanly at the top, and any duplicates a past run left behind collapse to one.
 * Comment blocks without the marker — hand-written notices — are left untouched.
 *
 * @param lines - The lines to strip managed blocks from.
 */
export function stripManagedBlocks(lines: readonly string[]): string[] {
  let result = [...lines];
  for (
    let bounds = findManagedBlock(result);
    bounds !== null;
    bounds = findManagedBlock(result)
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
