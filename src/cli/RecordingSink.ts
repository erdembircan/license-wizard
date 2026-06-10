/*
 * SPDX-License-Identifier: Apache-2.0
 * SPDX-FileCopyrightText: 2026 Erdem Bircan
 * license-wizard managed-header v1 Apache-2.0 short 74d1a0534fa2
 */

import type { IOutputSink } from "@cli/interfaces/IOutputSink.js";
import type { OutputMessage } from "@cli/OutputMessage.js";

/**
 * A sink that records every message it receives instead of rendering it,
 * exposing the captured view-model so callers — chiefly tests — can assert
 * against the data the reporter produced rather than its terminal prose.
 */
export class RecordingSink implements IOutputSink {
  readonly #messages: OutputMessage[] = [];

  /**
   * Records the given message in arrival order.
   */
  emit(message: OutputMessage): void {
    this.#messages.push(message);
  }

  /**
   * The messages received so far, in the order they were emitted.
   */
  get messages(): readonly OutputMessage[] {
    return this.#messages;
  }
}
