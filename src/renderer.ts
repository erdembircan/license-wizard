import * as clack from "@clack/prompts";
import type { Answer, Question } from "./types.js";

export interface IRenderer {
  render(question: Question): Promise<Answer>;
  onCancel(): string;
}

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
