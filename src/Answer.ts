/** Represents the user's response to a question. */
export type Answer = {
  /** The ID of the question this answer corresponds to. */
  questionId: string;
  /** The value entered by the user. */
  value: string;
};
