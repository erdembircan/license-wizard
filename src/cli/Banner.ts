import { styleText } from "node:util";

const WIZARD_GLYPH = "🧙";
// Columns the description/version rows are indented so they align under the name:
// the glyph renders double-width on modern terminals, plus the two trailing spaces.
const TEXT_INDENT = 4;

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
