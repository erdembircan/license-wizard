const DEFAULT_WIDTH = 80;

/**
 * Reflows text so each paragraph fills lines up to `width` columns, then hard-
 * wraps anything still too long.
 *
 * SPDX license texts are pre-wrapped, but at inconsistent widths: some
 * paragraphs are a single line hundreds of characters long, while others (such
 * as MIT) are already broken at roughly 100 columns. Simply wrapping the long
 * lines would leave the ~100-column paragraphs looking *more* broken — each
 * source line splitting into one full line plus a short orphan. So this pass
 * first rejoins soft-wrapped paragraphs, then re-wraps them to a single
 * conventional width, producing the clean, pre-formatted look of a hand-
 * formatted `LICENSE`.
 *
 * Reflow keys off the width alone, with no other heuristics: a source line
 * longer than `width` must have been wrapped at a wider setting, so the next
 * line at the same indentation is treated as its continuation and merged. A
 * source line already within `width` is a deliberate break — a heading, a list
 * item, the last line of a paragraph — and is preserved, as are blank lines and
 * indentation. Licenses already wrapped within `width` are therefore left
 * untouched. A single word longer than `width` (such as a long URL) is left to
 * overflow rather than broken mid-word. The pass is idempotent.
 *
 * @param text - The text to wrap.
 * @param width - The target line length, in columns. Defaults to 80.
 * @returns The reflowed, wrapped text.
 */
export function wrapText(text: string, width: number = DEFAULT_WIDTH): string {
  return reflowParagraphs(text, width)
    .map((line) => wrapLine(line, width))
    .join("\n");
}

/**
 * Rejoins soft-wrapped paragraphs into single logical lines. A line is merged
 * onto the previous one when that previous line ran past `width` (and so was
 * wrapped at a wider setting) and the two share the same leading indentation;
 * every other line, including blank lines, starts a new logical line.
 */
function reflowParagraphs(text: string, width: number): string[] {
  const logical: string[] = [];
  let previousLength = -1;
  let previousIndent: string | null = null;

  for (const line of text.split("\n")) {
    const isBlank = line.trim() === "";
    const indent = leadingWhitespace(line);
    const continuesParagraph =
      logical.length > 0 &&
      !isBlank &&
      previousLength > width &&
      indent === previousIndent;

    if (continuesParagraph) {
      logical[logical.length - 1] += ` ${line.slice(indent.length)}`;
    } else {
      logical.push(line);
    }

    previousLength = isBlank ? -1 : line.length;
    previousIndent = isBlank ? null : indent;
  }

  return logical;
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

  const indent = leadingWhitespace(line);
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

/**
 * Returns the run of whitespace at the start of the given line.
 */
function leadingWhitespace(line: string): string {
  return line.match(/^\s*/)![0];
}
