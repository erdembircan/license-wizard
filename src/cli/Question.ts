import type { Answer } from "@cli/Answer.js";

export type AutocompleteOption = {
  value: string;
  label: string;
  hint?: string;
};

export type QuestionLifecycle = {
  inject: (questions: Question[]) => void;
};

type BaseQuestion = {
  id: string;
  text: string;
  onAnswer?: (
    answer: Answer,
    lifecycle: QuestionLifecycle,
  ) => void | Promise<void>;
};

export type TextQuestion = BaseQuestion & {
  type: "text";
  initialValue?: string;
};

export type ConfirmQuestion = BaseQuestion & {
  type: "confirm";
  initialValue?: boolean;
};

export type AutocompleteQuestion = BaseQuestion & {
  type: "autocomplete";
  initialValue?: string;
  search?: (query: string) => Promise<AutocompleteOption[]>;
};

export type Question = TextQuestion | ConfirmQuestion | AutocompleteQuestion;

export type QuestionType = Question["type"];
