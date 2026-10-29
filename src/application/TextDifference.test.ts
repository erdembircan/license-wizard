/*
 * SPDX-License-Identifier: Apache-2.0
 * SPDX-FileCopyrightText: 2026 Erdem Bircan
 * license-wizard managed-header v1 Apache-2.0 short 74d1a0534fa2
 */

import { describe, it, expect } from "vitest";
import { firstDifference } from "@application/TextDifference.js";

describe("firstDifference", () => {
  it("returns null for identical texts", () => {
    expect(firstDifference("a\nb\n", "a\nb\n")).toBeNull();
  });

  it("names the first differing line, at column 1 when the lines share no prefix", () => {
    expect(firstDifference("a\nb\nc\n", "a\nx\nc\n")).toEqual({
      line: 2,
      column: 1,
      found: "b",
      expected: "x",
    });
  });

  it("names the column of the first differing character within a line", () => {
    const found =
      "<signature of Ty Coon>, 1 April 1989 Ty Coon, President of Vice\n";
    const expected =
      "<signature of Ty Coon>, 1 April 1989 Ty Coon , President of Vice\n";

    expect(firstDifference(found, expected)).toEqual({
      line: 1,
      column: 45,
      found: "<signature of Ty Coon>, 1 April 1989 Ty Coon, President of Vice",
      expected:
        "<signature of Ty Coon>, 1 April 1989 Ty Coon , President of Vice",
    });
  });

  it("points one past the shorter line when it is a prefix of the other", () => {
    expect(firstDifference("abc", "abc ")).toEqual({
      line: 1,
      column: 4,
      found: "abc",
      expected: "abc ",
    });
  });

  it("reports the first extra line of the expected text when the found text ends early", () => {
    expect(firstDifference("a\nb", "a\nb\n")).toEqual({
      line: 3,
      column: 1,
      found: null,
      expected: "",
    });
  });

  it("reports the first extra line of the found text when the expected text ends early", () => {
    expect(firstDifference("a\nb\nc", "a\nb")).toEqual({
      line: 3,
      column: 1,
      found: "c",
      expected: null,
    });
  });

  it("keeps a carriage return as part of its line", () => {
    expect(firstDifference("a\r\nb\r\n", "a\nb\n")).toEqual({
      line: 1,
      column: 2,
      found: "a\r",
      expected: "a",
    });
  });
});
