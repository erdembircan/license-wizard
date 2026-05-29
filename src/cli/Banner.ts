import { styleText } from "node:util";

const WIZARD_GLYPH = "🧙";
// Indentation for the description/version rows so they align under the name:
// the glyph renders double-width on modern terminals, plus the two trailing spaces.
const TEXT_INDENT = "    ";

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
  const color = options.color ?? true;

  if (!color) {
    return [
      `${WIZARD_GLYPH}  ${name}`,
      `${TEXT_INDENT}${description}`,
      `${TEXT_INDENT}${versionLine}`,
    ].join("\n");
  }

  return [
    `${WIZARD_GLYPH}  ${styleText(["bold", "blue"], name)}`,
    `${TEXT_INDENT}${styleText("dim", description)}`,
    `${TEXT_INDENT}${styleText("dim", versionLine)}`,
  ].join("\n");
}
