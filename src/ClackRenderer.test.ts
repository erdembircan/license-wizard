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
        const questionText = "Pick a license";
        const question: Question = {
          id: "license",
          text: questionText,
          type: "text",
        };

        const answer = await renderer.render(question);

        expect(clack.text).toHaveBeenCalledWith({ message: questionText });
        expect(answer).toEqual({ questionId: "license", value: "MIT" });
      });

      it("calls clack.cancel and exits with code 1 for an unsupported question type", async () => {
        const renderer = new ClackRenderer("test");
        const question = {
          id: "q1",
          text: "Unknown?",
          type: "unknown",
        } as unknown as Question;

        await renderer.render(question);

        expect(clack.cancel).toHaveBeenCalled();
        expect(process.exit).toHaveBeenCalledWith(1);
      });
    });
  });
});
