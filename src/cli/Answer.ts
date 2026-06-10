/*
 * SPDX-License-Identifier: Apache-2.0
 * SPDX-FileCopyrightText: 2026 Erdem Bircan
 * license-wizard managed-header v1 Apache-2.0 short 74d1a0534fa2
 */

export type Answer = {
  questionId: string;
  value: string | boolean;
  fields?: Record<string, string | boolean>;
};
