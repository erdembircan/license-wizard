/*
 * SPDX-License-Identifier: Apache-2.0
 * SPDX-FileCopyrightText: 2026 Erdem Bircan
 * license-wizard managed-header v1 Apache-2.0 short 74d1a0534fa2
 */

import { describe, it, expect } from "vitest";
import { CliReporter } from "@cli/CliReporter.js";
import { MessageReporter } from "@cli/MessageReporter.js";
import type { OutputMessage } from "@cli/OutputMessage.js";
import { ReportPresenter } from "@cli/ReportPresenter.js";

/**
 * Builds a fake non-TTY output stream that records writes, standing in for
 * process.stdout/stderr so the wiring can be exercised without a terminal.
 */
function fakeStream() {
  const stream = {
    isTTY: false,
    text: "",
    write(chunk: string): boolean {
      stream.text += chunk;
      return true;
    },
  };
  return stream;
}

const plain = (message: OutputMessage): string =>
  new ReportPresenter("license-wizard").present(message, { color: false });

/**
 * CliReporter is pure wiring — a MessageReporter pointed at a terminal
 * StreamSink/ReportPresenter. The message-building is covered by
 * MessageReporter.test.ts, the wording by ReportPresenter.test.ts, and the
 * stream/color routing by StreamSink.test.ts. These tests only confirm the three
 * are composed so a reporter call lands on the right stream as exactly what the
 * presenter would render — they compare against the presenter rather than
 * hard-coding prose, so a reword never reaches here.
 */
describe("CliReporter", () => {
  it("is a MessageReporter wired to the terminal", () => {
    expect(new CliReporter("license-wizard")).toBeInstanceOf(MessageReporter);
  });

  it("renders an informational call to the out stream", () => {
    const out = fakeStream();
    const err = fakeStream();

    new CliReporter("license-wizard", out, err).generated("MIT", "");

    expect(out.text).toBe(
      plain({
        kind: "generated",
        channel: "out",
        licenseId: "MIT",
        savedTo: "",
      }),
    );
    expect(err.text).toBe("");
  });

  it("renders an error call to the err stream", () => {
    const out = fakeStream();
    const err = fakeStream();

    new CliReporter("license-wizard", out, err).error("something went wrong");

    expect(err.text).toBe(
      plain({ kind: "error", channel: "err", message: "something went wrong" }),
    );
    expect(out.text).toBe("");
  });
});
