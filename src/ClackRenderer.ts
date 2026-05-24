import * as clack from "@clack/prompts";
import type { Answer } from "./Answer.js";
import type { IRenderer } from "./IRenderer.js";
import type { Question, QuestionType } from "./Question.js";

/**
 * Renders questions to the terminal using the Clack prompt library.
 */
export class ClackRenderer implements IRenderer {
  readonly #introLabel: string;

  /**
   * Creates a new ClackRenderer and immediately displays the intro label.
   *
   * @param introLabel - The label shown at the top of the prompt session.
   */
  constructor(introLabel: string) {
    this.#introLabel = introLabel;
    clack.intro(this.#introLabel);
  }

  /**
   * Renders a question to the terminal and returns the user's answer.
   *
   * @param question - The question to display.
   */
  async render(question: Question): Promise<Answer> {
    const value = await this.#promptForQuestion(question);

    if (clack.isCancel(value)) {
      clack.cancel(this.onCancel());
      process.exit(0);
    }

    return { questionId: question.id, value: value as string };
  }

  /**
   * Returns the message displayed when the user cancels the prompt session.
   */
  onCancel(): string {
    return "Operation cancelled.";
  }

  /**
   * Maps a question's type to its corresponding Clack prompt and invokes it.
   *
   * @param question - The question whose type determines the prompt to use.
   * @returns The user's raw answer string from the Clack prompt.
   */
  async #promptForQuestion(question: Question): Promise<string | symbol> {
    const promptMap: Partial<
      Record<QuestionType, (q: Question) => Promise<string | symbol>>
    > = {
      text: (q) => clack.text({ message: q.text }),
    };

    const prompt = promptMap[question.type];

    if (!prompt) {
      throw new Error(`Unsupported question type: "${question.type}"`);
    }

    return prompt(question);
  }
}
