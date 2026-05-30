import type { Answer } from "@cli/Answer.js";

export type AutocompleteOption = {
  value: string;
  label: string;
  hint?: string;
};

export type SelectOption = {
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
  defaultValue?: string;
};

export type ConfirmQuestion = BaseQuestion & {
  type: "confirm";
  defaultValue?: boolean;
};

export type AutocompleteQuestion = BaseQuestion & {
  type: "autocomplete";
  defaultValue?: string;
  search?: (query: string) => Promise<AutocompleteOption[]>;
};

export type SelectQuestion = BaseQuestion & {
  type: "select";
  options: SelectOption[];
  defaultValue?: string;
};

export type Question =
  | TextQuestion
  | ConfirmQuestion
  | AutocompleteQuestion
  | SelectQuestion;

export type QuestionType = Question["type"];
