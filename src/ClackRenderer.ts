import * as clack from "@clack/prompts";
import type { Answer } from "./Answer.js";
import type { IRenderer } from "./IRenderer.js";
import type { Question } from "./Question.js";

export class ClackRenderer implements IRenderer {
  readonly #introLabel: string;

  constructor(introLabel: string) {
    this.#introLabel = introLabel;
    clack.intro(this.#introLabel);
  }

  async render(question: Question): Promise<Answer> {
    const value = await clack.text({ message: question.text });

    if (clack.isCancel(value)) {
      clack.cancel(this.onCancel());
      process.exit(0);
    }

    return { questionId: question.id, value };
  }

  onCancel(): string {
    return "Operation cancelled.";
  }
}
