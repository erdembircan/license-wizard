import type { IOutputSink } from "@cli/interfaces/IOutputSink.js";
import type { OutputMessage } from "@cli/OutputMessage.js";
import type { ReportPresenter } from "@cli/ReportPresenter.js";

type OutputStream = {
  write(chunk: string): boolean;
  isTTY?: boolean;
};

/**
 * A sink that renders each message through a presenter and writes it to a
 * terminal stream — informational messages to stdout, errors to stderr. Color is
 * decided per destination: ANSI codes are emitted only when that stream is an
 * interactive terminal with neither `NO_COLOR` nor a dumb terminal set, so piped
 * or redirected output (scripts, agents) stays plain text.
 */
export class StreamSink implements IOutputSink {
  readonly #presenter: ReportPresenter;
  readonly #out: OutputStream;
  readonly #err: OutputStream;

  /**
   * Creates a new StreamSink.
   *
   * @param presenter - Renders messages to terminal text.
   * @param out - The stream for informational output; defaults to stdout.
   * @param err - The stream for error output; defaults to stderr.
   */
  constructor(
    presenter: ReportPresenter,
    out: OutputStream = process.stdout,
    err: OutputStream = process.stderr,
  ) {
    this.#presenter = presenter;
    this.#out = out;
    this.#err = err;
  }

  /**
   * Renders the message and writes it to the stream its channel selects.
   */
  emit(message: OutputMessage): void {
    const stream = message.channel === "err" ? this.#err : this.#out;
    const text = this.#presenter.present(message, {
      color: this.#useColor(stream),
    });
    stream.write(text);
  }

  /**
   * Reports whether the given stream can display ANSI color: it must be an
   * interactive terminal, with neither `NO_COLOR` nor a dumb terminal set.
   *
   * @param stream - The destination stream being written to.
   */
  #useColor(stream: OutputStream): boolean {
    return (
      stream.isTTY === true &&
      !process.env.NO_COLOR &&
      process.env.TERM !== "dumb"
    );
  }
}
