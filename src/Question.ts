export type AutocompleteOption = {
  value: string;
  label: string;
  hint?: string;
};

export type TextQuestion = {
  id: string;
  text: string;
  type: "text";
};

export type ConfirmQuestion = {
  id: string;
  text: string;
  type: "confirm";
};

export type AutocompleteQuestion = {
  id: string;
  text: string;
  type: "autocomplete";
  search?: (query: string) => Promise<AutocompleteOption[]>;
};

export type Question = TextQuestion | ConfirmQuestion | AutocompleteQuestion;

export type QuestionType = Question["type"];
