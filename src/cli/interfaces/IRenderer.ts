/*
 * SPDX-License-Identifier: Apache-2.0
 * SPDX-FileCopyrightText: 2026 Erdem Bircan
 * license-wizard managed-header v1 Apache-2.0 short 74d1a0534fa2
 */

import type { Answer } from "@cli/Answer.js";
import type { Question } from "@cli/Question.js";
import type { HeaderStyle } from "@headers/HeaderPlan.js";

export type CompletionHeaders = {
  style: HeaderStyle;
  written: number;
  total: number;
};

export type CompletionSummary = {
  licenseId: string;
  customized: boolean;
  savedTo: string;
  manifests: string[];
  headers?: CompletionHeaders;
};

/**
 * Contract for rendering questions and collecting user answers.
 */
export interface IRenderer {
  /**
   * Renders a question and returns the user's answer.
   *
   * @param question - The question to display.
   */
  render(question: Question): Promise<Answer>;

  /**
   * Returns the message displayed when the user cancels the prompt session.
   */
  onCancel(): string;

  /**
   * Renders the closing confirmation shown once the wizard has finished writing
   * the license, summarizing what was conjured and where it was recorded.
   *
   * @param summary - The generated license, whether its copyright was
   *   customized, the manifests it was recorded in, and the config save location.
   */
  complete(summary: CompletionSummary): void;
}
