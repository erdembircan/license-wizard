/*
 * SPDX-License-Identifier: Apache-2.0
 * SPDX-FileCopyrightText: 2026 Erdem Bircan
 * license-wizard managed-header v1 Apache-2.0 short 74d1a0534fa2
 */

const DEFAULT_INDENT = "  ";
const DEFAULT_TRAILING_NEWLINE = "\n";

/**
 * The formatting style of a JSON document — its indentation unit and trailing
 * newline — captured from existing source so a rewrite reproduces it rather than
 * imposing a fixed style. Editing a single field then stays a single-line diff
 * instead of reformatting the whole file.
 */
export class JsonStyle {
  readonly #indent: string;
  readonly #trailingNewline: string;

  private constructor(indent: string, trailingNewline: string) {
    this.#indent = indent;
    this.#trailingNewline = trailingNewline;
  }

  /**
   * Infers the style of the given JSON source: the indentation of its first
   * indented line (tabs or spaces, used verbatim) and the trailing newline it
   * ends with. A minified single-line document reveals no indentation and is
   * reproduced compact, exactly as written.
   *
   * @param raw - The raw JSON document to inspect.
   */
  static detect(raw: string): JsonStyle {
    return new JsonStyle(detectIndent(raw), detectTrailingNewline(raw));
  }

  /**
   * The style applied to a manifest created from scratch, when there is no
   * existing source to detect from: two-space indentation and a trailing
   * newline.
   */
  static default(): JsonStyle {
    return new JsonStyle(DEFAULT_INDENT, DEFAULT_TRAILING_NEWLINE);
  }

  /**
   * Serializes the given value as JSON in this style.
   *
   * @param value - The value to serialize.
   */
  serialize(value: unknown): string {
    return `${JSON.stringify(value, null, this.#indent)}${this.#trailingNewline}`;
  }
}

/**
 * Returns the indentation of the first indented line in the source, or an empty
 * string when none is found (a minified document), which serializes compact.
 * Newlines inside JSON strings are escaped, so scanning the raw text never
 * mistakes string content for layout.
 *
 * @param raw - The raw JSON document to inspect.
 */
function detectIndent(raw: string): string {
  const match = raw.match(/^([ \t]+)\S/m);
  return match ? match[1] : "";
}

/**
 * Returns the trailing newline sequence the source ends with — CRLF, LF, or
 * none — so it is reproduced exactly.
 *
 * @param raw - The raw JSON document to inspect.
 */
function detectTrailingNewline(raw: string): string {
  if (raw.endsWith("\r\n")) {
    return "\r\n";
  }
  if (raw.endsWith("\n")) {
    return "\n";
  }
  return "";
}
