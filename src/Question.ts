import type { QuestionType } from "./QuestionType.js";

export type Question = {
  id: string;
  text: string;
  type: QuestionType;
};
