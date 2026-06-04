import { describe, it, expect } from "vitest";
import { classifyTreeLine, lineMarker } from "./terminalLine";

describe("classifyTreeLine", () => {
  it("recognizes each tree glyph", () => {
    expect(classifyTreeLine("◇  Which license?").glyph).toBe("node-hollow");
    expect(classifyTreeLine("◆  Wrote LICENSE (MIT)").glyph).toBe(
      "node-filled",
    );
    expect(classifyTreeLine("│  › MIT").glyph).toBe("connector");
    expect(classifyTreeLine("└  Done").glyph).toBe("end");
  });

  it("treats non-tree lines (banner, blank, command) as plain", () => {
    expect(classifyTreeLine("🧙  license-wizard").glyph).toBeNull();
    expect(classifyTreeLine("").glyph).toBeNull();
    expect(classifyTreeLine("    pick a license").glyph).toBeNull();
  });

  it("strips the glyph and its standard two-space gutter", () => {
    expect(classifyTreeLine("◇  Which license?").content).toBe(
      "Which license?",
    );
    expect(classifyTreeLine("◆  Wrote LICENSE (MIT)").content).toBe(
      "Wrote LICENSE (MIT)",
    );
  });

  it("preserves deeper indentation of nested list items", () => {
    // Selected item keeps no extra indent; nested options keep two spaces.
    expect(classifyTreeLine("│  › MIT — MIT License").content).toBe(
      "› MIT — MIT License",
    );
    expect(
      classifyTreeLine("│    Apache-2.0 — Apache License 2.0").content,
    ).toBe("  Apache-2.0 — Apache License 2.0");
  });

  it("returns empty content for a bare connector", () => {
    expect(classifyTreeLine("│")).toEqual({ glyph: "connector", content: "" });
  });

  it("does not treat agent markers (⏺ ✦) as tree glyphs", () => {
    expect(classifyTreeLine("⏺ Bash(...)").glyph).toBeNull();
    expect(classifyTreeLine("✦ Conjured your LICENSE").glyph).toBeNull();
  });

  it("leaves plain-line content untouched", () => {
    expect(classifyTreeLine("    pick a license").content).toBe(
      "    pick a license",
    );
  });
});

describe("lineMarker", () => {
  it("detects the agent bullet and success spark", () => {
    expect(lineMarker("⏺ Bash(npx license-wizard)")).toBe("bullet");
    expect(lineMarker("✦ Conjured your LICENSE (MIT)")).toBe("check");
  });

  it("returns null for ordinary lines and indented continuations", () => {
    expect(lineMarker("  copyright details.")).toBeNull();
    expect(lineMarker("  ⎿ MIT accepts the following field(s):")).toBeNull();
    expect(lineMarker("")).toBeNull();
  });
});
