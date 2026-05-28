import type { Answer } from "@cli/Answer.js";

export type AutocompleteOption = {
  value: string;
  label: string;
  hint?: string;
};

type BaseQuestion = {
  id: string;
  text: string;
  onAnswer?: (answer: Answer) => Question[] | Promise<Question[]>;
};

export type TextQuestion = BaseQuestion & {
  type: "text";
};

export type ConfirmQuestion = BaseQuestion & {
  type: "confirm";
};

export type AutocompleteQuestion = BaseQuestion & {
  type: "autocomplete";
  search?: (query: string) => Promise<AutocompleteOption[]>;
};

export type Question = TextQuestion | ConfirmQuestion | AutocompleteQuestion;

export type QuestionType = Question["type"];
