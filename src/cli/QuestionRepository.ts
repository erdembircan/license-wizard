import type { Question } from "@cli/Question.js";

/**
 * Stores and provides access to a collection of questions by index.
 */
export class QuestionRepository {
  readonly #questions: Question[];

  /**
   * Creates a new QuestionRepository with the given questions.
   */
  constructor(questions: Question[]) {
    this.#questions = [...questions];
  }

  /**
   * Returns the question at the given index, or null if the index is out of bounds.
   */
  getByIndex(index: number): Question | null {
    return this.#questions[index] ?? null;
  }

  /**
   * Returns a shallow copy of all questions in the repository.
   */
  getAll(): Question[] {
    return [...this.#questions];
  }
}
