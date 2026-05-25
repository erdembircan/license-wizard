export type QuestionType = "text" | "confirm" | "autocomplete";

export type AutocompleteOption = {
  value: string;
  label: string;
  hint?: string;
};

export type Question = {
  id: string;
  text: string;
  type: QuestionType;
  search?: (query: string) => Promise<AutocompleteOption[]>;
};
