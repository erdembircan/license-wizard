/*
 * SPDX-License-Identifier: Apache-2.0
 * SPDX-FileCopyrightText: 2026 Erdem Bircan
 * license-wizard managed-header v1 Apache-2.0 short 74d1a0534fa2
 */

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
  /**
   * When true, an empty or whitespace-only answer is rejected and re-asked
   * rather than accepted — mirroring the non-interactive path, which treats a
   * blank value as a missing field instead of writing it.
   */
  required?: boolean;
};

export type ConfirmQuestion = BaseQuestion & {
  type: "confirm";
  defaultValue?: boolean;
};

export type AutocompleteQuestion = BaseQuestion & {
  type: "autocomplete";
  defaultValue?: string;
  search?: (query: string) => Promise<AutocompleteOption[]>;
  /**
   * When true, submitting with no option selected is rejected and re-asked
   * rather than returning an empty/undefined value the caller would silently
   * treat as "nothing chosen" and skip.
   */
  required?: boolean;
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
