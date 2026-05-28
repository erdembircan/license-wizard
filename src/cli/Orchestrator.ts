import type { Answer } from "@cli/Answer.js";
import type { IRenderer } from "@cli/interfaces/IRenderer.js";
import type { Question } from "@cli/Question.js";
import type { QuestionRepository } from "@cli/QuestionRepository.js";

/**
 * Drives the question-and-answer session by iterating all questions
 * in the repository and delegating rendering to the provided renderer.
 *
 * When a question declares an `onAnswer` callback, the returned follow-up
 * questions are rendered immediately after the parent. Their answers are
 * collected into the parent answer's `fields` map rather than surfaced as
 * top-level entries in the result array.
 */
export class Orchestrator {
  readonly #repository: QuestionRepository;
  readonly #renderer: IRenderer;

  /**
   * Creates a new Orchestrator with the given repository and renderer.
   */
  constructor(repository: QuestionRepository, renderer: IRenderer) {
    this.#repository = repository;
    this.#renderer = renderer;
  }

  /**
   * Iterates all questions, renders each one, and returns the collected answers.
   * Follow-up questions injected via `onAnswer` are rolled up into the parent
   * answer's `fields` rather than added to the top-level result.
   */
  async run(): Promise<Answer[]> {
    const queue: Question[] = this.#repository.getAll();
    const answers: Answer[] = [];

    while (queue.length > 0) {
      const question = queue.shift()!;
      const answer = await this.#renderer.render(question);

      if (question.onAnswer) {
        const followUps = await question.onAnswer(answer);
        if (followUps.length > 0) {
          const fields = await this.#renderFollowUps(followUps);
          answers.push({ ...answer, fields });
          continue;
        }
      }

      answers.push(answer);
    }

    return answers;
  }

  async #renderFollowUps(
    questions: Question[],
  ): Promise<Record<string, string | boolean>> {
    const fields: Record<string, string | boolean> = {};

    for (const question of questions) {
      const answer = await this.#renderer.render(question);

      if (question.onAnswer) {
        const nested = await question.onAnswer(answer);
        if (nested.length > 0) {
          const nestedFields = await this.#renderFollowUps(nested);
          fields[question.id] = answer.value;
          Object.assign(fields, nestedFields);
          continue;
        }
      }

      fields[question.id] = answer.value;
    }

    return fields;
  }
}
