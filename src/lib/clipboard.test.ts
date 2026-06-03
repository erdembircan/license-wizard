import { describe, it, expect, vi, afterEach } from "vitest";
import { copyToClipboard } from "./clipboard";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("copyToClipboard", () => {
  it("uses the async Clipboard API when available", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });

    await expect(copyToClipboard("npx license-wizard")).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith("npx license-wizard");
  });

  it("falls back to execCommand when the Clipboard API rejects", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("denied"));
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    const execCommand = vi.fn().mockReturnValue(true);
    // jsdom does not implement execCommand, so provide one.
    document.execCommand =
      execCommand as unknown as typeof document.execCommand;

    await expect(copyToClipboard("text")).resolves.toBe(true);
    expect(execCommand).toHaveBeenCalledWith("copy");
  });

  it("reports failure when neither path can copy", async () => {
    vi.stubGlobal("navigator", {});
    document.execCommand = undefined as unknown as typeof document.execCommand;

    await expect(copyToClipboard("text")).resolves.toBe(false);
  });
});
