import type { Question } from "@cli/Question.js";

/**
 * Stores and provides access to a collection of questions by index.
 * Supports mid-session insertion of follow-up questions via `insertAt`.
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
   * Inserts questions at the given index, shifting existing questions to the right.
   */
  insertAt(index: number, questions: Question[]): void {
    this.#questions.splice(index, 0, ...questions);
  }
}
