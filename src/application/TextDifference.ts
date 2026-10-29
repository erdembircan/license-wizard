/*
 * SPDX-License-Identifier: Apache-2.0
 * SPDX-FileCopyrightText: 2026 Erdem Bircan
 * license-wizard managed-header v1 Apache-2.0 short 74d1a0534fa2
 */

export type TextDifference = {
  line: number;
  column: number;
  found: string | null;
  expected: string | null;
};

/**
 * Locates the first point where two texts diverge. They are compared line by
 * line, split on `\n` only, so a carriage return or a trailing space stays part
 * of its line and shows up as a difference. The line and column are 1-based;
 * the column is one past the shorter line when that line is a prefix of the
 * other. When one text runs out of lines first, the difference is the first
 * line the other has beyond it, at column 1, with the missing side null.
 * Returns null when the texts are identical.
 *
 * @param found - The text as found, e.g. the `LICENSE` file on disk.
 * @param expected - The text it should match, e.g. the re-rendered license.
 * @returns The line, column, and both versions of the first differing line.
 */
export function firstDifference(
  found: string,
  expected: string,
): TextDifference | null {
  if (found === expected) {
    return null;
  }

  const foundLines = found.split("\n");
  const expectedLines = expected.split("\n");
  const count = Math.max(foundLines.length, expectedLines.length);

  for (let index = 0; index < count; index++) {
    const foundLine = foundLines[index] ?? null;
    const expectedLine = expectedLines[index] ?? null;
    if (foundLine !== expectedLine) {
      return {
        line: index + 1,
        column: firstDifferingColumn(foundLine, expectedLine),
        found: foundLine,
        expected: expectedLine,
      };
    }
  }

  return null;
}

/**
 * Returns the 1-based column of the first character at which two lines differ:
 * one past the shorter line when it is a prefix of the longer, or 1 when either
 * line is missing.
 *
 * @param found - The line as found, or null when it is missing.
 * @param expected - The line as expected, or null when it is missing.
 */
function firstDifferingColumn(
  found: string | null,
  expected: string | null,
): number {
  if (found === null || expected === null) {
    return 1;
  }

  let index = 0;
  while (
    index < found.length &&
    index < expected.length &&
    found[index] === expected[index]
  ) {
    index++;
  }
  return index + 1;
}
