import type { Answer } from "@cli/Answer.js";
import type { IRenderer } from "@cli/interfaces/IRenderer.js";
import type { QuestionRepository } from "@cli/QuestionRepository.js";

/**
 * Drives the question-and-answer session by iterating all questions
 * in the repository and delegating rendering to the provided renderer.
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
   * Iterates all questions in the repository, renders each one, and returns the collected answers.
   */
  async run(): Promise<Answer[]> {
    const answers: Answer[] = [];
    let index = 0;

    while (true) {
      const question = this.#repository.getByIndex(index);
      if (question === null) break;

      const answer = await this.#renderer.render(question);
      answers.push(answer);
      index++;
    }

    return answers;
  }
}
