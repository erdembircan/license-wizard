import { describe, it, expect, vi } from "vitest";
import { Orchestrator } from "@cli/Orchestrator.js";
import { QuestionRepository } from "@cli/QuestionRepository.js";
import type { IRenderer } from "@cli/interfaces/IRenderer.js";
import type { Question, QuestionLifecycle } from "@cli/Question.js";
import type { Answer } from "@cli/Answer.js";

const makeQuestion = (id: string, overrides?: Partial<Question>): Question =>
  ({
    id,
    text: `Question ${id}`,
    type: "text",
    ...overrides,
  }) as Question;

const makeRenderer = (answerValue = "some-answer"): IRenderer => ({
  render: vi.fn(
    async (question: Question): Promise<Answer> => ({
      questionId: question.id,
      value: answerValue,
    }),
  ),
  onCancel: vi.fn(() => "Operation cancelled."),
  complete: vi.fn(),
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
        complete: vi.fn(),
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

    it("does not set fields when onAnswer injects nothing", async () => {
      const q = makeQuestion("q0", { onAnswer: async () => undefined });
      const repo = new QuestionRepository([q]);
      const renderer = makeRenderer("yes");
      const orchestrator = new Orchestrator(repo, renderer);

      const answers = await orchestrator.run();

      expect(answers).toEqual([{ questionId: "q0", value: "yes" }]);
    });

    it("rolls follow-up answers into the parent fields and omits them from the top-level result", async () => {
      const followUp1 = makeQuestion("year");
      const followUp2 = makeQuestion("author");
      const parent = makeQuestion("fill", {
        onAnswer: async (_answer: Answer, lifecycle: QuestionLifecycle) => {
          lifecycle.inject([followUp1, followUp2]);
        },
      });
      const repo = new QuestionRepository([parent]);

      const renderer: IRenderer = {
        render: vi.fn(
          async (question: Question): Promise<Answer> => ({
            questionId: question.id,
            value: question.id === "fill" ? true : `value-for-${question.id}`,
          }),
        ),
        onCancel: vi.fn(() => ""),
        complete: vi.fn(),
      };

      const orchestrator = new Orchestrator(repo, renderer);
      const answers = await orchestrator.run();

      expect(answers).toHaveLength(1);
      expect(answers[0]).toEqual({
        questionId: "fill",
        value: true,
        fields: {
          year: "value-for-year",
          author: "value-for-author",
        },
      });
    });

    it("renders follow-ups in the order injected", async () => {
      const followUp1 = makeQuestion("first");
      const followUp2 = makeQuestion("second");
      const parent = makeQuestion("parent", {
        onAnswer: (_answer: Answer, lifecycle: QuestionLifecycle) => {
          lifecycle.inject([followUp1, followUp2]);
        },
      });
      const repo = new QuestionRepository([parent]);

      const renderOrder: string[] = [];
      const renderer: IRenderer = {
        render: vi.fn(async (question: Question): Promise<Answer> => {
          renderOrder.push(question.id);
          return { questionId: question.id, value: "v" };
        }),
        onCancel: vi.fn(() => ""),
        complete: vi.fn(),
      };

      const orchestrator = new Orchestrator(repo, renderer);
      await orchestrator.run();

      expect(renderOrder).toEqual(["parent", "first", "second"]);
    });

    it("awaits an async onAnswer before rendering follow-ups", async () => {
      const followUp = makeQuestion("followUp");
      const resolved = vi.fn(
        async (_answer: Answer, lifecycle: QuestionLifecycle) => {
          lifecycle.inject([followUp]);
        },
      );
      const parent = makeQuestion("parent", { onAnswer: resolved });
      const repo = new QuestionRepository([parent]);
      const renderer = makeRenderer("v");
      const orchestrator = new Orchestrator(repo, renderer);

      await orchestrator.run();

      expect(resolved).toHaveBeenCalledOnce();
      expect(renderer.render).toHaveBeenCalledTimes(2);
    });

    it("keeps static questions flat alongside questions that have follow-ups", async () => {
      const followUp = makeQuestion("followUp");
      const withFollowUp = makeQuestion("parent", {
        onAnswer: (_answer: Answer, lifecycle: QuestionLifecycle) => {
          lifecycle.inject([followUp]);
        },
      });
      const staticQ = makeQuestion("static");
      const repo = new QuestionRepository([withFollowUp, staticQ]);

      const renderer: IRenderer = {
        render: vi.fn(
          async (question: Question): Promise<Answer> => ({
            questionId: question.id,
            value: `v-${question.id}`,
          }),
        ),
        onCancel: vi.fn(() => ""),
        complete: vi.fn(),
      };

      const orchestrator = new Orchestrator(repo, renderer);
      const answers = await orchestrator.run();

      expect(answers).toEqual([
        {
          questionId: "parent",
          value: "v-parent",
          fields: { followUp: "v-followUp" },
        },
        { questionId: "static", value: "v-static" },
      ]);
    });

    it("rolls nested follow-up answers into the ancestor's fields", async () => {
      const deepFollowUp = makeQuestion("deep");
      const midFollowUp = makeQuestion("mid", {
        onAnswer: (_answer: Answer, lifecycle: QuestionLifecycle) => {
          lifecycle.inject([deepFollowUp]);
        },
      });
      const parent = makeQuestion("parent", {
        onAnswer: (_answer: Answer, lifecycle: QuestionLifecycle) => {
          lifecycle.inject([midFollowUp]);
        },
      });
      const repo = new QuestionRepository([parent]);

      const renderer: IRenderer = {
        render: vi.fn(
          async (question: Question): Promise<Answer> => ({
            questionId: question.id,
            value: `v-${question.id}`,
          }),
        ),
        onCancel: vi.fn(() => ""),
        complete: vi.fn(),
      };

      const orchestrator = new Orchestrator(repo, renderer);
      const answers = await orchestrator.run();

      expect(answers).toHaveLength(1);
      expect(answers[0]).toEqual({
        questionId: "parent",
        value: "v-parent",
        fields: {
          mid: "v-mid",
          deep: "v-deep",
        },
      });
    });
  });
});
