/*
 * SPDX-License-Identifier: Apache-2.0
 * SPDX-FileCopyrightText: 2026 Erdem Bircan
 * license-wizard managed-header v1 Apache-2.0 short 74d1a0534fa2
 */

import { styleText } from "node:util";

const WIZARD_GLYPH = "🧙";
// Columns the description/version rows are indented so they align under the name:
// the glyph renders double-width on modern terminals, plus the two trailing spaces.
const TEXT_INDENT = 4;

// The plain-Markdown docs URL published for non-human callers, surfaced in the
// agent hint so an agent or script can pivot to the flag-driven flow.
const AGENT_DOCS_URL =
  "https://erdembircan.github.io/license-wizard/documentation.md";

// A short tagline shown under the name in the startup header. The package.json
// description is deliberately long for npm search visibility, which wraps over
// several lines and looks cramped on narrow terminals — so the header uses this
// concise one-liner instead.
export const BANNER_TAGLINE =
  "Generate the right LICENSE and keep your project in sync with it.";

/**
 * Builds the CLI startup header: the wizard glyph followed by the package name,
 * with the description and version on the two lines beneath it.
 *
 * @param meta - The package name, description, and version to display.
 * @param options - Set `color: false` to emit plain text with no ANSI styling
 *   (for non-TTY output, `NO_COLOR`, or dumb terminals).
 * @returns The multi-line header string.
 */
export function buildBanner(
  meta: { name: string; description: string; version: string },
  options: { color?: boolean } = {},
): string {
  const { name, description, version } = meta;
  const versionLine = `v${version}`;
  const indent = " ".repeat(TEXT_INDENT);
  const color = options.color ?? true;

  if (!color) {
    return [
      `${WIZARD_GLYPH}  ${name}`,
      `${indent}${description}`,
      `${indent}${versionLine}`,
    ].join("\n");
  }

  // The caller decides whether color is wanted (TTY / NO_COLOR detection), so
  // disable styleText's own stream sniffing and always emit the codes here.
  const opts = { validateStream: false } as const;

  return [
    `${WIZARD_GLYPH}  ${styleText(["bold", "blue"], name, opts)}`,
    `${indent}${styleText("dim", description, opts)}`,
    `${indent}${styleText("dim", versionLine, opts)}`,
  ].join("\n");
}

/**
 * Builds the agent hint shown beneath the startup banner: a short notice that
 * this is a prompt-driven flow and that automated callers should switch to the
 * non-interactive, flag-driven mode, with a link to the plain-Markdown docs.
 *
 * It is printed unconditionally — the wizard makes no attempt to sniff whether
 * the caller is human (TTY checks are unreliable across agent harnesses, some
 * of which allocate a pseudo-terminal). Instead the hint is always visible, so
 * an agent reading the output learns to abandon the prompts and use the flags.
 *
 * @param options - Set `color: false` to emit plain text with no ANSI styling
 *   (for non-TTY output, `NO_COLOR`, or dumb terminals).
 * @returns The two-line hint string.
 */
export function buildAgentHint(options: { color?: boolean } = {}): string {
  const indent = " ".repeat(TEXT_INDENT);
  const color = options.color ?? true;
  const lines = [
    `${indent}Agent or script? Skip the prompts — use the non-interactive flags instead.`,
    `${indent}Docs: ${AGENT_DOCS_URL}`,
  ];

  if (!color) {
    return lines.join("\n");
  }

  // Match buildBanner: the caller owns the color decision, so disable
  // styleText's stream sniffing and always emit the codes here.
  const opts = { validateStream: false } as const;
  return lines.map((line) => styleText("dim", line, opts)).join("\n");
}
