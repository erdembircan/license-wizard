import { describe, it, expect } from "vitest";
import { THINKING_PHRASES, THINKING_FRAMES, thinkingMeta } from "./thinking";

describe("thinking status", () => {
  it("provides phrases and spinner frames to animate", () => {
    expect(THINKING_PHRASES.length).toBeGreaterThan(3);
    expect(THINKING_FRAMES.length).toBeGreaterThan(2);
  });

  it("formats the status meta like Claude Code", () => {
    expect(thinkingMeta(7, 109)).toBe(
      "(7s · ↓ 109 tokens · thinking with high effort)",
    );
  });
});
