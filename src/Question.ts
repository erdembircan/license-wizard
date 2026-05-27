export type QuestionType = "text" | "confirm";

export type Question = {
  id: string;
  text: string;
  type: QuestionType;
};
