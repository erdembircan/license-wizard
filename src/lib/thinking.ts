// The whimsical gerunds Claude Code cycles through while thinking.
export const THINKING_PHRASES = [
  "Architecting",
  "Pondering",
  "Cogitating",
  "Conjuring",
  "Channeling",
  "Synthesizing",
  "Ruminating",
  "Noodling",
  "Percolating",
  "Finagling",
  "Wrangling",
  "Marinating",
];

// Spinner frames for the animated star/asterisk that twinkles while thinking.
export const THINKING_FRAMES = ["✶", "✸", "✺", "✦", "✳"];

/**
 * Formats the parenthetical status Claude Code shows beside the thinking
 * spinner, e.g. `(7s · ↓ 109 tokens · thinking with high effort)`.
 */
export function thinkingMeta(seconds: number, tokens: number): string {
  return `(${seconds}s · ↓ ${tokens} tokens · thinking with high effort)`;
}
