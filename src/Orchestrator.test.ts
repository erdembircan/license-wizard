import { describe, it, expect, vi } from "vitest";
import { Orchestrator } from "./Orchestrator.js";
import { QuestionRepository } from "./QuestionRepository.js";
import type { IRenderer } from "./IRenderer.js";
import type { Question } from "./Question.js";
import type { Answer } from "./Answer.js";

const makeQuestion = (id: string): Question => ({
  id,
  text: `Question ${id}`,
  type: "text",
});

const makeRenderer = (answerValue = "some-answer"): IRenderer => ({
  render: vi.fn(
    async (question: Question): Promise<Answer> => ({
      questionId: question.id,
      value: answerValue,
    }),
  ),
  onCancel: vi.fn(() => "Operation cancelled."),
});

describe("Orchestrator", () => {
  describe("run", () => {
    it("returns an empty array when there are no questions", async () => {
      const repo = new QuestionRepository([]);
      const renderer = makeRenderer();
      const orchestrator = new Orchestrator(repo, renderer);

      const answers = await orchestrator.run();

      expect(answers).toEqual([]);
    });

    it("returns one answer for a single question", async () => {
      const q = makeQuestion("license");
      const repo = new QuestionRepository([q]);
      const renderer = makeRenderer("MIT");
      const orchestrator = new Orchestrator(repo, renderer);

      const answers = await orchestrator.run();

      expect(answers).toEqual([{ questionId: "license", value: "MIT" }]);
    });

    it("returns answers in the same order as the questions", async () => {
      const q0 = makeQuestion("q0");
      const q1 = makeQuestion("q1");
      const q2 = makeQuestion("q2");
      const repo = new QuestionRepository([q0, q1, q2]);

      const renderer: IRenderer = {
        render: vi.fn(
          async (question: Question): Promise<Answer> => ({
            questionId: question.id,
            value: `answer-for-${question.id}`,
          }),
        ),
        onCancel: vi.fn(() => ""),
      };

      const orchestrator = new Orchestrator(repo, renderer);
      const answers = await orchestrator.run();

      expect(answers).toEqual([
        { questionId: "q0", value: "answer-for-q0" },
        { questionId: "q1", value: "answer-for-q1" },
        { questionId: "q2", value: "answer-for-q2" },
      ]);
    });

    it("renders every question in the repository", async () => {
      const q0 = makeQuestion("q0");
      const q1 = makeQuestion("q1");
      const repo = new QuestionRepository([q0, q1]);
      const renderer = makeRenderer();
      const orchestrator = new Orchestrator(repo, renderer);

      await orchestrator.run();

      expect(renderer.render).toHaveBeenCalledTimes(2);
      expect(renderer.render).toHaveBeenNthCalledWith(1, q0);
      expect(renderer.render).toHaveBeenNthCalledWith(2, q1);
    });
  });
});
