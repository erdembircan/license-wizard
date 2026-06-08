import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { ReportPresenter } from "@cli/ReportPresenter.js";
import { StreamSink } from "@cli/StreamSink.js";

const ESC = "[";

/**
 * Builds a fake output stream that records writes and reports the given TTY
 * status, standing in for process.stdout/stderr.
 */
function fakeStream(isTTY: boolean) {
  const stream = {
    isTTY,
    text: "",
    write(chunk: string): boolean {
      stream.text += chunk;
      return true;
    },
  };
  return stream;
}

const presenter = new ReportPresenter("license-wizard");

describe("StreamSink", () => {
  let savedTerm: string | undefined;
  let savedNoColor: string | undefined;

  beforeEach(() => {
    savedTerm = process.env.TERM;
    savedNoColor = process.env.NO_COLOR;
  });

  afterEach(() => {
    if (savedTerm === undefined) delete process.env.TERM;
    else process.env.TERM = savedTerm;
    if (savedNoColor === undefined) delete process.env.NO_COLOR;
    else process.env.NO_COLOR = savedNoColor;
  });

  it("routes informational messages to out and errors to err", () => {
    const out = fakeStream(false);
    const err = fakeStream(false);
    const sink = new StreamSink(presenter, out, err);

    const info = {
      kind: "generated",
      channel: "out",
      licenseId: "MIT",
      savedTo: "",
    } as const;
    const oops = { kind: "error", channel: "err", message: "boom" } as const;
    sink.emit(info);
    sink.emit(oops);

    // Compared against the presenter's own output rather than hard-coded prose,
    // so the routing assertion survives any rewording.
    expect(out.text).toBe(presenter.present(info, { color: false }));
    expect(err.text).toBe(presenter.present(oops, { color: false }));
  });

  it("emits no ANSI codes when the stream is not a TTY (agent/pipe usage)", () => {
    const stream = fakeStream(false);
    new StreamSink(presenter, stream, stream).emit({
      kind: "generated",
      channel: "out",
      licenseId: "MIT",
      savedTo: "",
    });

    expect(stream.text).not.toContain(ESC);
  });

  it("emits ANSI codes on an interactive terminal", () => {
    process.env.TERM = "xterm";
    delete process.env.NO_COLOR;
    const stream = fakeStream(true);

    const message = {
      kind: "generated",
      channel: "out",
      licenseId: "MIT",
      savedTo: ".licensewizardrc.json",
    } as const;
    new StreamSink(presenter, stream, stream).emit(message);

    // The rendered text itself is covered by the presenter's plain snapshots;
    // here we only assert that an interactive terminal gets ANSI codes.
    expect(stream.text).toContain(ESC);
  });

  it("stays plain on a TTY when NO_COLOR is set", () => {
    process.env.TERM = "xterm";
    process.env.NO_COLOR = "1";
    const stream = fakeStream(true);

    new StreamSink(presenter, stream, stream).emit({
      kind: "error",
      channel: "err",
      message: "boom",
    });

    expect(stream.text).toBe("boom\n");
  });

  it("stays plain on a dumb terminal", () => {
    process.env.TERM = "dumb";
    delete process.env.NO_COLOR;
    const stream = fakeStream(true);

    new StreamSink(presenter, stream, stream).emit({
      kind: "tokens",
      channel: "out",
      licenseId: "MIT",
      slots: [{ token: "<year>", label: "year" }],
    });

    expect(stream.text).not.toContain(ESC);
  });
});
