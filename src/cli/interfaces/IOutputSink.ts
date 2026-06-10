/*
 * SPDX-License-Identifier: Apache-2.0
 * SPDX-FileCopyrightText: 2026 Erdem Bircan
 * license-wizard managed-header v1 Apache-2.0 short 74d1a0534fa2
 */

import type { OutputMessage } from "@cli/OutputMessage.js";

/**
 * Contract for the destination of the reporter's view-model messages. The
 * reporter builds each `OutputMessage` and hands it to a sink; a sink decides
 * what to do with it — render it to a terminal stream, collect it for tests, or
 * forward it elsewhere.
 */
export interface IOutputSink {
  /**
   * Receives one rendered view-model message.
   *
   * @param message - The message describing a single line of CLI output.
   */
  emit(message: OutputMessage): void;
}
