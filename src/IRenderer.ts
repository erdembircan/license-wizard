import type { Answer } from "./Answer.js";
import type { Question } from "./Question.js";

/**
 * Contract for rendering questions and collecting user answers.
 */
export interface IRenderer {
  /**
   * Renders a question and returns the user's answer.
   *
   * @param question - The question to display.
   */
  render(question: Question): Promise<Answer>;

  /**
   * Returns the message displayed when the user cancels the prompt session.
   */
  onCancel(): string;
}
