/*
 * SPDX-License-Identifier: Apache-2.0
 * SPDX-FileCopyrightText: 2026 Erdem Bircan
 * license-wizard managed-header v1 Apache-2.0 short 74d1a0534fa2
 */

import { describe, it, expect } from "vitest";
import { wrapText } from "@licensing/TextWrapper.js";

const normalize = (text: string): string => text.replace(/\s+/g, " ").trim();

describe("wrapText", () => {
  it("leaves lines already within the width untouched", () => {
    const text = "MIT License\n\nA short line.";

    expect(wrapText(text)).toBe(text);
  });

  it("wraps a long line on word boundaries to at most the width", () => {
    const width = 20;
    const text = "the quick brown fox jumps over the lazy dog";

    const wrapped = wrapText(text, width);

    expect(wrapped).toBe("the quick brown fox\njumps over the lazy\ndog");
    for (const line of wrapped.split("\n")) {
      expect(line.length).toBeLessThanOrEqual(width);
    }
  });

  it("preserves the words exactly when wrapping", () => {
    const text =
      "Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files.";

    expect(normalize(wrapText(text, 40))).toBe(normalize(text));
  });

  it("carries leading indentation onto continuation lines", () => {
    const text =
      "     (a) You must give any other recipients a copy of this License.";

    const wrapped = wrapText(text, 30);

    for (const line of wrapped.split("\n")) {
      expect(line.startsWith("     ")).toBe(true);
      expect(line.length).toBeLessThanOrEqual(30);
    }
    expect(normalize(wrapped)).toBe(normalize(text));
  });

  it("does not break a single word longer than the width", () => {
    const text = "see https://www.apache.org/licenses/LICENSE-2.0 for details";

    const wrapped = wrapText(text, 20);

    expect(wrapped).toContain("https://www.apache.org/licenses/LICENSE-2.0");
    expect(wrapped.split("\n")).toContain(
      "https://www.apache.org/licenses/LICENSE-2.0",
    );
  });

  it("preserves blank lines between paragraphs", () => {
    const text = "First paragraph.\n\nSecond paragraph.";

    expect(wrapText(text, 40)).toBe(text);
  });

  it("preserves a trailing newline", () => {
    const text = "A line that is quite a bit longer than the chosen width.\n";

    expect(wrapText(text, 20).endsWith("\n")).toBe(true);
  });

  it("defaults to wrapping at 80 columns", () => {
    const text = "word ".repeat(40).trim();

    for (const line of wrapText(text).split("\n")) {
      expect(line.length).toBeLessThanOrEqual(80);
    }
  });

  it("reflows a paragraph that was soft-wrapped at a wider width", () => {
    // Two source lines, the first past the width, are one paragraph wrapped
    // wider than 80. Reflowing then re-wrapping must match wrapping the
    // equivalent single joined line — i.e. no short orphan lines remain.
    const firstLine =
      "Permission is hereby granted, free of charge, to any person obtaining a copy of";
    const secondLine =
      "this software and associated documentation files, to deal in the Software.";
    const softWrapped = `${firstLine}\n${secondLine}`;
    const joined = `${firstLine} ${secondLine}`;

    expect(wrapText(softWrapped, 80)).toBe(wrapText(joined, 80));
  });

  it("does not merge a short deliberate line into the following paragraph", () => {
    const heading = "1. Definitions";
    const longBody =
      "This clause runs well past the chosen width so that it would otherwise wrap onto a second line.";

    const wrapped = wrapText(`${heading}\n${longBody}`, 80);

    expect(wrapped.split("\n")[0]).toBe(heading);
  });

  it("leaves text already wrapped within the width untouched", () => {
    const text =
      "This text is already\nwrapped narrowly on\npurpose, every line short.";

    expect(wrapText(text, 80)).toBe(text);
  });

  it("does not merge lines at different indentation", () => {
    const flush =
      "This flush-left line is deliberately longer than the chosen width so it passes the threshold.";
    const indented = "    a differently indented following line";

    const wrapped = wrapText(`${flush}\n${indented}`, 80);

    expect(wrapped.split("\n")).toContain(indented);
  });

  it("is idempotent", () => {
    const text =
      "A long paragraph line that certainly exceeds the chosen width and will be wrapped into several lines by the pass.";

    const once = wrapText(text, 40);

    expect(wrapText(once, 40)).toBe(once);
  });
});
