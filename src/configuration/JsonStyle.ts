/*
 * SPDX-License-Identifier: Apache-2.0
 * SPDX-FileCopyrightText: 2026 Erdem Bircan
 * license-wizard managed-header v1 Apache-2.0 short 74d1a0534fa2
 */

const DEFAULT_INDENT = "  ";
const DEFAULT_NEWLINE = "\n";
const DEFAULT_TRAILING_NEWLINE = "\n";

/**
 * The formatting style of a JSON document — its indentation unit, internal line
 * separator (LF or CRLF), and trailing newline — captured from existing source
 * so a rewrite reproduces it rather than imposing a fixed style. Editing a
 * single field then stays a single-line diff instead of reformatting the whole
 * file.
 */
export class JsonStyle {
  readonly #indent: string;
  readonly #newline: string;
  readonly #trailingNewline: string;

  private constructor(
    indent: string,
    newline: string,
    trailingNewline: string,
  ) {
    this.#indent = indent;
    this.#newline = newline;
    this.#trailingNewline = trailingNewline;
  }

  /**
   * Infers the style of the given JSON source: the indentation of its first
   * indented line (tabs or spaces, used verbatim), the line separator it uses
   * internally (LF or CRLF), and the trailing newline it ends with. A minified
   * single-line document reveals no indentation and is reproduced compact,
   * exactly as written.
   *
   * @param raw - The raw JSON document to inspect.
   */
  static detect(raw: string): JsonStyle {
    return new JsonStyle(
      detectIndent(raw),
      detectNewline(raw),
      detectTrailingNewline(raw),
    );
  }

  /**
   * The style applied to a manifest created from scratch, when there is no
   * existing source to detect from: two-space indentation and a trailing
   * newline.
   */
  static default(): JsonStyle {
    return new JsonStyle(
      DEFAULT_INDENT,
      DEFAULT_NEWLINE,
      DEFAULT_TRAILING_NEWLINE,
    );
  }

  /**
   * Serializes the given value as JSON in this style. `JSON.stringify` always
   * emits LF for layout newlines, so when the source used CRLF those internal
   * separators are rewritten back to CRLF. Escaped newlines inside string
   * values are emitted as the two characters `\n`, never a real newline, so the
   * rewrite never touches string content.
   *
   * @param value - The value to serialize.
   */
  serialize(value: unknown): string {
    const body = JSON.stringify(value, null, this.#indent);
    const rebodied =
      this.#newline === "\r\n" ? body.replace(/\n/g, "\r\n") : body;
    return `${rebodied}${this.#trailingNewline}`;
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
 * Returns the dominant internal line separator of the source — CRLF when it
 * outnumbers bare LFs, otherwise LF (also the default for a single-line
 * document with no internal newlines). Escaped newlines inside JSON strings are
 * the two characters `\n`, not real newlines, so they never sway the count.
 *
 * @param raw - The raw JSON document to inspect.
 */
function detectNewline(raw: string): string {
  const crlf = (raw.match(/\r\n/g) ?? []).length;
  const bareLf = (raw.match(/\n/g) ?? []).length - crlf;
  return crlf > bareLf ? "\r\n" : "\n";
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
