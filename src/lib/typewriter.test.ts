import { describe, it, expect, vi } from "vitest";
import { typingFrames, runTypewriter } from "./typewriter";

describe("typingFrames", () => {
  it("starts empty and ends with the full string", () => {
    const frames = typingFrames("npx");
    expect(frames[0]).toBe("");
    expect(frames.at(-1)).toBe("npx");
  });

  it("adds exactly one character per frame", () => {
    expect(typingFrames("abc")).toEqual(["", "a", "ab", "abc"]);
  });

  it("yields a single empty frame for an empty string", () => {
    expect(typingFrames("")).toEqual([""]);
  });
});

describe("runTypewriter", () => {
  it("emits every prefix and signals completion", () => {
    vi.useFakeTimers();
    const frames: string[] = [];
    const onDone = vi.fn();

    runTypewriter("hi", { charMs: 10, onFrame: (f) => frames.push(f), onDone });
    vi.runAllTimers();

    expect(frames).toEqual(["", "h", "hi"]);
    expect(onDone).toHaveBeenCalledOnce();
    vi.useRealTimers();
  });

  it("stops emitting once cancelled", () => {
    vi.useFakeTimers();
    const frames: string[] = [];

    const cancel = runTypewriter("hello", {
      charMs: 10,
      onFrame: (f) => frames.push(f),
    });
    cancel();
    vi.runAllTimers();

    // Only the immediate first frame was emitted before cancelling.
    expect(frames).toEqual([""]);
    vi.useRealTimers();
  });
});
