import * as clack from "@clack/prompts";
import { styleText } from "node:util";
import type { Answer } from "./Answer.js";
import type { IRenderer } from "./IRenderer.js";
import type { Question, QuestionType } from "./Question.js";

/**
 * Renders questions to the terminal using the Clack prompt library.
 */
export class ClackRenderer implements IRenderer {
  /**
   * Creates a new ClackRenderer and immediately displays the intro label.
   */
  constructor(introLabel: string) {
    clack.intro(styleText("inverse", introLabel));
  }

  /**
   * Renders a question to the terminal and returns the user's answer.
   */
  async render(question: Question): Promise<Answer> {
    let value: string | symbol;

    try {
      value = await this.#promptForQuestion(question);
    } catch (err) {
      clack.cancel(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }

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
