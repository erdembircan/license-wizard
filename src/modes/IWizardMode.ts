/*
 * SPDX-License-Identifier: Apache-2.0
 * SPDX-FileCopyrightText: 2026 Erdem Bircan
 * license-wizard managed-header v1 Apache-2.0 short 74d1a0534fa2
 */

import type { Answer } from "@cli/Answer.js";

/**
 * Contract for a wizard run mode: a self-contained workflow that runs to
 * completion through a single entry point.
 */
export interface IWizardMode {
  /**
   * Runs the mode to completion and returns the answers it collected, or an
   * empty array when the mode collects none.
   */
  run(): Promise<Answer[]>;
}
