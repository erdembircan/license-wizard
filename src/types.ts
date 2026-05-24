export type QuestionType = "text";

export type Question = {
  id: string;
  text: string;
  type: QuestionType;
};

export type Answer = {
  questionId: string;
  value: string;
};
