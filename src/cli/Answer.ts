export type Answer = {
  questionId: string;
  value: string | boolean;
  fields?: Record<string, string | boolean>;
};
