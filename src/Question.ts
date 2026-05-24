/** Supported prompt input types for a question. */
export type QuestionType = "text";

/** Represents a single question presented to the user during the wizard flow. */
export type Question = {
  /** Unique identifier for the question. */
  id: string;
  /** The prompt text shown to the user. */
  text: string;
  /** The type of input expected from the user. */
  type: QuestionType;
};
