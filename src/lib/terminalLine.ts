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

export type LineMarker =
  | "bullet" // ⏺ — an agent action (Claude Code style), tinted orange
  | "check" //  ✦ — a success spark, tinted green
  | null;

/**
 * Detects a leading status marker (an agent's ⏺ bullet or a ✦ success spark) so
 * just that glyph can be colored while the rest of the line keeps its own tone.
 */
export function lineMarker(text: string): LineMarker {
  if (text.startsWith("⏺")) return "bullet";
  if (text.startsWith("✦")) return "check";
  return null;
}
