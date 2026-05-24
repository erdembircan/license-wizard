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
  });
});
