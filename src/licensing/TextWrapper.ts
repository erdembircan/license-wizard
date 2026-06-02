const DEFAULT_WIDTH = 80;

/**
 * Hard-wraps each line of the given text to at most `width` columns, preserving
 * the document's existing line structure.
 *
 * SPDX license texts store each paragraph as a single unwrapped line (some run
 * to hundreds of characters), relying on the viewer to soft-wrap. This pass
 * bakes the wrapping in so the written `LICENSE` reads like a conventional,
 * pre-formatted legal document.
 *
 * Lines already within `width` are left untouched, so blank lines, short
 * headers, and pre-aligned content are preserved verbatim. A long line is
 * greedily wrapped on word boundaries, and its leading indentation is carried
 * onto every continuation line so indented blocks (such as lettered clauses)
 * keep their shape. A single word longer than `width` is left to overflow
 * rather than being broken mid-word.
 *
 * @param text - The text to wrap.
 * @param width - The maximum line length, in columns. Defaults to 80.
 * @returns The text with every over-long line wrapped.
 */
export function wrapText(text: string, width: number = DEFAULT_WIDTH): string {
  return text
    .split("\n")
    .map((line) => wrapLine(line, width))
    .join("\n");
}

/**
 * Wraps a single line to at most `width` columns, preserving its leading
 * indentation on continuation lines. Returns the line unchanged when it already
 * fits.
 */
function wrapLine(line: string, width: number): string {
  if (line.length <= width) {
    return line;
  }

  const indent = line.match(/^\s*/)![0];
  const words = line.slice(indent.length).split(/\s+/);

  const wrapped: string[] = [];
  let current = indent;

  for (const word of words) {
    if (current === indent) {
      current += word;
    } else if (current.length + 1 + word.length <= width) {
      current += ` ${word}`;
    } else {
      wrapped.push(current);
      current = indent + word;
    }
  }
  wrapped.push(current);

  return wrapped.join("\n");
}
