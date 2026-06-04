/**
 * Describes how a license header is embedded as a comment in a given family of
 * source files: the tokens that open and close a block comment and the prefix
 * each interior line carries.
 */
export type CommentStyle = {
  blockStart: string;
  linePrefix: string;
  blockEnd: string;
};

// Every ecosystem this tool supports (the npm and Composer worlds) writes its
// source in C-family syntax, so a single block-comment style covers them all.
const C_BLOCK: CommentStyle = {
  blockStart: "/*",
  linePrefix: " *",
  blockEnd: " */",
};

// Maps each supported extension to its comment style. They all share the
// C-family block style today, but routing through a map keeps the door open for
// a language that needs its own.
const STYLE_BY_EXTENSION: Record<string, CommentStyle> = {};

/**
 * The source file extensions a header is written into by default. JSON has no
 * comment syntax and stylesheet/markup files are not source code, so neither is
 * included; the set is the JavaScript/TypeScript family plus PHP, matching the
 * manifest ecosystems the wizard already understands.
 */
export const DEFAULT_SOURCE_EXTENSIONS: readonly string[] = [
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".ts",
  ".tsx",
  ".cts",
  ".mts",
  ".php",
];

for (const extension of DEFAULT_SOURCE_EXTENSIONS) {
  STYLE_BY_EXTENSION[extension] = C_BLOCK;
}

/**
 * Returns the lowercased extension of a path including its leading dot (e.g.
 * `.ts`), or the empty string when the path has no extension.
 */
export function extensionOf(filePath: string): string {
  const base = filePath.slice(filePath.lastIndexOf("/") + 1);
  const dot = base.lastIndexOf(".");
  return dot <= 0 ? "" : base.slice(dot).toLowerCase();
}

/**
 * Reports whether the given path is a source file the wizard writes headers
 * into, judged solely by its extension against the supported set.
 *
 * @param filePath - The path to test.
 * @param extensions - The supported extensions; defaults to the standard set.
 */
export function isSupportedSource(
  filePath: string,
  extensions: readonly string[] = DEFAULT_SOURCE_EXTENSIONS,
): boolean {
  return extensions.includes(extensionOf(filePath));
}

/**
 * Returns the comment style used to embed a header in files of the given
 * extension. Every supported extension shares the C-family block style.
 */
export function commentStyleFor(extension: string): CommentStyle {
  return STYLE_BY_EXTENSION[extension] ?? C_BLOCK;
}

/**
 * Splits a file's lines into the leading preamble that must stay above any
 * header — a `#!` shebang, and for PHP the opening `<?php` tag line — and the
 * remaining body. Placing the header after these keeps shebangs executable and
 * the comment inside PHP's tags rather than emitted as page output.
 *
 * @param lines - The file split into lines (without trailing newline handling).
 * @param extension - The file's extension, used to detect the PHP open tag.
 * @returns The count of leading lines that form the preamble.
 */
export function preambleLength(
  lines: readonly string[],
  extension: string,
): number {
  let index = 0;

  if (lines[index]?.startsWith("#!")) {
    index += 1;
  }

  if (extension === ".php") {
    for (let scan = index; scan < lines.length; scan += 1) {
      if (lines[scan].trim() === "") {
        continue;
      }
      if (lines[scan].trimStart().startsWith("<?php")) {
        return scan + 1;
      }
      // First meaningful line is not an open tag; do not claim a PHP preamble.
      break;
    }
  }

  return index;
}
