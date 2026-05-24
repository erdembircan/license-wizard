import type { Answer } from "./Answer.js";
import type { Question } from "./Question.js";

export interface IRenderer {
  render(question: Question): Promise<Answer>;
  onCancel(): string;
}
