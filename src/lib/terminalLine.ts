export type TreeGlyph =
  | "node-hollow" // ◇ — a prompt step
  | "node-filled" // ◆ — a completed/success step
  | "connector" //   │ — a vertical connector
  | "end" //         └ — the closing corner
  | null; //         not part of Clack's tree (banner, blank, command, …)

export interface ClassifiedLine {
  glyph: TreeGlyph;
  /** Line text with the leading tree glyph + its standard 2-space gutter removed. */
  content: string;
}

const GLYPHS: Record<string, TreeGlyph> = {
  "◇": "node-hollow",
  "◆": "node-filled",
  "│": "connector",
  "└": "end",
};

/**
 * Splits a Clack-style terminal line into its tree glyph and the remaining
 * content, so the connector column can be drawn with CSS (a continuous line)
 * instead of relying on the box-drawing character tiling between rows.
 *
 * Only the glyph and up to two following spaces are stripped, preserving any
 * deeper indentation (e.g. autocomplete list items nested under a prompt).
 */
export function classifyTreeLine(text: string): ClassifiedLine {
  const glyph = GLYPHS[text.charAt(0)] ?? null;
  if (!glyph) {
    return { glyph: null, content: text };
  }
  return { glyph, content: text.slice(1).replace(/^ {1,2}/, "") };
}
