import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Question } from "./Question.js";

vi.mock("@clack/prompts", () => ({
  intro: vi.fn(),
  text: vi.fn(),
  cancel: vi.fn(),
  isCancel: vi.fn(),
}));

const clack = await import("@clack/prompts");
const { ClackRenderer } = await import("./ClackRenderer.js");

describe("ClackRenderer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(process, "exit").mockImplementation(() => undefined as never);
  });

  describe("constructor", () => {
    it("calls clack.intro with the provided label", () => {
      new ClackRenderer("License Wizard");
      expect(clack.intro).toHaveBeenCalledWith("License Wizard");
    });
  });

  describe("onCancel", () => {
    it("returns the cancellation message", () => {
      const renderer = new ClackRenderer("test");
      expect(renderer.onCancel()).toBe("Operation cancelled.");
    });
  });

  describe("render", () => {
    describe("prompt mapping", () => {
      it("calls clack.text for a text question type", async () => {
        vi.mocked(clack.text).mockResolvedValue("MIT");
        vi.mocked(clack.isCancel).mockReturnValue(false);

        const renderer = new ClackRenderer("test");
        const question: Question = {
          id: "license",
          text: "Pick a license",
          type: "text",
        };

        const answer = await renderer.render(question);

        expect(clack.text).toHaveBeenCalledWith({ message: "Pick a license" });
        expect(answer).toEqual({ questionId: "license", value: "MIT" });
      });

      it("throws and calls clack.cancel for an unsupported question type", async () => {
        const renderer = new ClackRenderer("test");
        const question = {
          id: "q1",
          text: "Unknown?",
          type: "unknown",
        } as unknown as Question;

        await renderer.render(question);

        expect(clack.cancel).toHaveBeenCalledWith(
          'Unsupported question type: "unknown"',
        );
        expect(process.exit).toHaveBeenCalledWith(1);
      });
    });

    describe("user cancellation", () => {
      it("calls clack.cancel and exits with 0 when the user cancels", async () => {
        const cancelSymbol = Symbol("cancel");
        vi.mocked(clack.text).mockResolvedValue(
          cancelSymbol as unknown as string,
        );
        vi.mocked(clack.isCancel).mockReturnValue(true);

        const renderer = new ClackRenderer("test");
        const question: Question = {
          id: "q1",
          text: "Pick a license",
          type: "text",
        };

        await renderer.render(question);

        expect(clack.cancel).toHaveBeenCalledWith("Operation cancelled.");
        expect(process.exit).toHaveBeenCalledWith(0);
      });
    });
  });
});
