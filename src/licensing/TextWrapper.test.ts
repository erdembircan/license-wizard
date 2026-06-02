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
});
